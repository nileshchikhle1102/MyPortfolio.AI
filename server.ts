import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

interface GitHubUserSummary {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  location: string | null;
  blog: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

interface SessionRecord {
  accessToken: string;
  user: GitHubUserSummary;
  createdAt: number;
}

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const sessions = new Map<string, SessionRecord>();
const oauthStates = new Map<string, number>();
const apiCache = new Map<string, CacheEntry>();
const contactMessages: Array<{
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}> = [];

const SESSION_COOKIE = 'gh_portfolio_sid';

function getAppBaseUrl(): string {
  const raw = process.env.APP_URL || `http://localhost:${PORT}`;
  return raw.replace(/\/+$/, '');
}

function getCallbackUrl(): string {
  return `${getAppBaseUrl()}/auth/github/callback`;
}

function parseCookies(header: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) result[key] = decodeURIComponent(value);
  }
  return result;
}

function getSessionFromRequest(req: Request): SessionRecord | null {
  const cookies = parseCookies(req.headers.cookie);
  const headerSid = req.headers['x-github-session'];
  const sid =
    (typeof headerSid === 'string' && headerSid.trim()) ||
    cookies[SESSION_COOKIE] ||
    '';
  if (!sid) return null;
  return sessions.get(sid) || null;
}

function buildGitHubHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'nileshchikhle-portfolio-server',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchGitHubJson<T>(
  url: string,
  token?: string,
  cacheTtlMs = 120_000
): Promise<{ ok: boolean; status: number; data: T | null; error?: string; rateRemaining?: string | null }> {
  const cacheKey = `${token ? 'auth:' : 'pub:'}${url}`;
  const now = Date.now();
  const cached = apiCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return { ok: true, status: 200, data: cached.data as T };
  }

  const response = await fetch(url, { headers: buildGitHubHeaders(token) });
  const rateRemaining = response.headers.get('x-ratelimit-remaining');

  if (!response.ok) {
    let errorMessage = `GitHub API returned status ${response.status}`;
    try {
      const errJson = (await response.json()) as { message?: string };
      if (errJson?.message) errorMessage = errJson.message;
    } catch {
      // ignore non-json error body
    }
    return { ok: false, status: response.status, data: null, error: errorMessage, rateRemaining };
  }

  const data = (await response.json()) as T;
  if (cacheTtlMs > 0) {
    apiCache.set(cacheKey, { data, expiresAt: now + cacheTtlMs });
  }
  return { ok: true, status: 200, data, rateRemaining };
}

function isSafeSegment(value: string): boolean {
  return /^[A-Za-z0-9_.-]+$/.test(value);
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // OAuth status
  app.get('/api/auth/github/status', (req: Request, res: Response) => {
    const configured = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
    const session = getSessionFromRequest(req);
    res.json({
      configured,
      connected: Boolean(session),
      callbackUrl: getCallbackUrl(),
      user: session?.user ?? null,
    });
  });

  // Construct GitHub OAuth provider authorization URL directly
  app.get('/api/auth/github/url', (_req: Request, res: Response) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      res.status(400).json({
        error: 'GitHub OAuth credentials are not configured yet.',
        callbackUrl: getCallbackUrl(),
        missingCredentials: true,
      });
      return;
    }

    const state = crypto.randomBytes(20).toString('hex');
    oauthStates.set(state, Date.now() + 10 * 60 * 1000);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: getCallbackUrl(),
      scope: 'repo read:user user:email',
      state,
    });

    res.json({
      url: `https://github.com/login/oauth/authorize?${params.toString()}`,
    });
  });

  // OAuth callback (handles both trailing slash variations)
  const handleOAuthCallback = async (req: Request, res: Response) => {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const oauthError = typeof req.query.error === 'string' ? req.query.error : '';

    const sendPopupResult = (payload: Record<string, unknown>, message: string) => {
      const serialized = JSON.stringify(payload).replace(/</g, '\\u003c');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>GitHub Authorization</title></head>
  <body style="font-family:system-ui,sans-serif;padding:24px;color:#111;background:#fafafa;">
    <script>
      if (window.opener) {
        window.opener.postMessage(${serialized}, '*');
        window.close();
      } else {
        window.location.href = '/';
      }
    </script>
    <p>${message}</p>
  </body>
</html>`);
    };

    if (oauthError || !code) {
      sendPopupResult(
        { type: 'OAUTH_AUTH_ERROR', error: oauthError || 'Authorization code missing.' },
        'Authorization was canceled or incomplete. You can close this window.'
      );
      return;
    }

    const stateExpiry = oauthStates.get(state);
    oauthStates.delete(state);
    if (!state || !stateExpiry || stateExpiry < Date.now()) {
      sendPopupResult(
        { type: 'OAUTH_AUTH_ERROR', error: 'Invalid or expired OAuth state.' },
        'Authorization session expired. Please try again.'
      );
      return;
    }

    try {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: getCallbackUrl(),
        }),
      });

      const tokenJson = (await tokenRes.json()) as {
        access_token?: string;
        error?: string;
        error_description?: string;
      };

      if (!tokenJson.access_token) {
        sendPopupResult(
          { type: 'OAUTH_AUTH_ERROR', error: tokenJson.error_description || tokenJson.error || 'Token exchange failed.' },
          'Failed to complete GitHub sign-in. You can close this window.'
        );
        return;
      }

      const userResult = await fetchGitHubJson<GitHubUserSummary>(
        'https://api.github.com/user',
        tokenJson.access_token,
        0
      );

      if (!userResult.ok || !userResult.data) {
        sendPopupResult(
          { type: 'OAUTH_AUTH_ERROR', error: userResult.error || 'Failed to load GitHub profile.' },
          'Unable to load GitHub profile.'
        );
        return;
      }

      const sessionId = crypto.randomBytes(24).toString('hex');
      sessions.set(sessionId, {
        accessToken: tokenJson.access_token,
        user: userResult.data,
        createdAt: Date.now(),
      });

      res.cookie(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      sendPopupResult(
        { type: 'OAUTH_AUTH_SUCCESS', sessionId, login: userResult.data.login },
        'GitHub connected successfully. This window will close automatically.'
      );
    } catch (error) {
      console.error('GitHub OAuth callback error:', error);
      sendPopupResult(
        { type: 'OAUTH_AUTH_ERROR', error: 'Unexpected error completing GitHub OAuth.' },
        'Authentication failed. Please close this window and retry.'
      );
    }
  };

  app.get(['/auth/github/callback', '/auth/github/callback/'], handleOAuthCallback);

  app.post('/api/auth/github/logout', (req: Request, res: Response) => {
    const cookies = parseCookies(req.headers.cookie);
    const headerSid = req.headers['x-github-session'];
    const sid = (typeof headerSid === 'string' && headerSid) || cookies[SESSION_COOKIE];
    if (sid) sessions.delete(sid);
    res.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
    res.json({ ok: true });
  });

  // Fetch public GitHub profile + repos (uses OAuth token when connected for higher rate limit & private repos)
  app.get('/api/github/profile/:username', async (req: Request, res: Response) => {
    const username = String(req.params.username || '').trim();
    if (!isSafeSegment(username)) {
      res.status(400).json({ error: 'Invalid GitHub username.' });
      return;
    }

    const session = getSessionFromRequest(req);
    const isOwnAuthenticated =
      session && session.user.login.toLowerCase() === username.toLowerCase();
    const token = session?.accessToken;

    const userUrl = isOwnAuthenticated
      ? 'https://api.github.com/user'
      : `https://api.github.com/users/${encodeURIComponent(username)}`;
    const reposUrl = isOwnAuthenticated
      ? 'https://api.github.com/user/repos?sort=updated&per_page=50&affiliation=owner'
      : `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=50`;

    try {
      const [userRes, reposRes] = await Promise.all([
        fetchGitHubJson<GitHubUserSummary>(userUrl, token, 180_000),
        fetchGitHubJson<Array<Record<string, unknown>>>(reposUrl, token, 180_000),
      ]);

      if (!userRes.ok || !userRes.data) {
        res.status(userRes.status || 502).json({
          error: userRes.error || 'Could not load GitHub profile.',
        });
        return;
      }

      const repos = Array.isArray(reposRes.data)
        ? reposRes.data.map((repo) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            html_url: repo.html_url,
            homepage: repo.homepage,
            language: repo.language,
            stargazers_count: repo.stargazers_count,
            forks_count: repo.forks_count,
            open_issues_count: repo.open_issues_count,
            updated_at: repo.updated_at,
            pushed_at: repo.pushed_at,
            default_branch: repo.default_branch,
            private: Boolean(repo.private),
            topics: Array.isArray(repo.topics) ? repo.topics : [],
          }))
        : [];

      res.json({
        user: userRes.data,
        repos,
        authenticated: Boolean(isOwnAuthenticated),
        rateRemaining: reposRes.rateRemaining ?? userRes.rateRemaining ?? null,
      });
    } catch (error) {
      console.error('GitHub profile proxy error:', error);
      res.status(502).json({ error: 'Failed to reach GitHub API.' });
    }
  });

  // Browse repository files & source code
  app.get('/api/github/repos/:owner/:repo/contents', async (req: Request, res: Response) => {
    const owner = String(req.params.owner || '');
    const repo = String(req.params.repo || '');
    const filePath = typeof req.query.path === 'string' ? req.query.path.replace(/^\/+/, '') : '';

    if (!isSafeSegment(owner) || !isSafeSegment(repo)) {
      res.status(400).json({ error: 'Invalid repository path.' });
      return;
    }

    const session = getSessionFromRequest(req);
    const encodedPath = filePath
      .split('/')
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/');
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents${encodedPath ? `/${encodedPath}` : ''}`;

    try {
      const result = await fetchGitHubJson<unknown>(url, session?.accessToken, 120_000);
      if (!result.ok || !result.data) {
        res.status(result.status || 404).json({ error: result.error || 'Path not found.' });
        return;
      }

      if (Array.isArray(result.data)) {
        const items = result.data
          .map((item: Record<string, unknown>) => ({
            name: String(item.name || ''),
            path: String(item.path || ''),
            type: String(item.type || 'file'),
            size: Number(item.size || 0),
          }))
          .sort((a, b) => {
            if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
        res.json({ kind: 'dir', path: filePath, items });
        return;
      }

      const fileObj = result.data as Record<string, unknown>;
      const encoding = String(fileObj.encoding || '');
      const rawContent = String(fileObj.content || '');
      let decoded = '';
      if (encoding === 'base64' && rawContent) {
        decoded = Buffer.from(rawContent.replace(/\n/g, ''), 'base64').toString('utf8');
      }

      res.json({
        kind: 'file',
        name: String(fileObj.name || ''),
        path: String(fileObj.path || ''),
        size: Number(fileObj.size || 0),
        html_url: String(fileObj.html_url || ''),
        content: decoded,
      });
    } catch (error) {
      console.error('GitHub contents proxy error:', error);
      res.status(502).json({ error: 'Failed to load repository contents.' });
    }
  });

  // Fetch README + languages + recent commits for a repository
  app.get('/api/github/repos/:owner/:repo/details', async (req: Request, res: Response) => {
    const owner = String(req.params.owner || '');
    const repo = String(req.params.repo || '');
    if (!isSafeSegment(owner) || !isSafeSegment(repo)) {
      res.status(400).json({ error: 'Invalid repository identifier.' });
      return;
    }

    const session = getSessionFromRequest(req);
    const token = session?.accessToken;
    const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

    try {
      const [readmeRes, langRes, commitsRes] = await Promise.all([
        fetchGitHubJson<{ content?: string; encoding?: string }>(`${base}/readme`, token, 180_000),
        fetchGitHubJson<Record<string, number>>(`${base}/languages`, token, 180_000),
        fetchGitHubJson<Array<Record<string, unknown>>>(`${base}/commits?per_page=6`, token, 120_000),
      ]);

      let readme = '';
      if (readmeRes.ok && readmeRes.data?.content) {
        readme = Buffer.from(readmeRes.data.content.replace(/\n/g, ''), 'base64').toString('utf8');
      }

      const commits = Array.isArray(commitsRes.data)
        ? commitsRes.data.map((entry) => {
            const commit = (entry.commit || {}) as Record<string, unknown>;
            const author = (commit.author || {}) as Record<string, unknown>;
            return {
              sha: String(entry.sha || '').slice(0, 7),
              message: String(commit.message || '').split('\n')[0],
              date: String(author.date || ''),
              author: String(author.name || ''),
              html_url: String(entry.html_url || ''),
            };
          })
        : [];

      res.json({
        readme,
        languages: langRes.ok && langRes.data ? langRes.data : {},
        commits,
      });
    } catch (error) {
      console.error('GitHub details proxy error:', error);
      res.status(502).json({ error: 'Failed to load repository details.' });
    }
  });

  // Deploy generated standalone portfolio directly to a GitHub repository (requires OAuth)
  app.post('/api/github/deploy', async (req: Request, res: Response) => {
    const session = getSessionFromRequest(req);
    if (!session) {
      res.status(401).json({ error: 'Connect with GitHub OAuth first to publish directly.' });
      return;
    }

    const repoName = String(req.body?.repoName || 'myportfolio').trim();
    const htmlContent = String(req.body?.htmlContent || '');
    const commitMessage = String(
      req.body?.commitMessage || 'Optimize portfolio with verified projects and experience'
    ).trim();

    if (!isSafeSegment(repoName) || !htmlContent) {
      res.status(400).json({ error: 'Valid repository name and HTML bundle are required.' });
      return;
    }

    const owner = session.user.login;
    const headers = buildGitHubHeaders(session.accessToken);

    try {
      const targetUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/contents/index.html`;
      let existingSha: string | undefined;

      const checkRes = await fetch(targetUrl, { headers });
      if (checkRes.ok) {
        const existing = (await checkRes.json()) as { sha?: string };
        existingSha = existing.sha;
      }

      const putRes = await fetch(targetUrl, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commitMessage,
          content: Buffer.from(htmlContent, 'utf8').toString('base64'),
          ...(existingSha ? { sha: existingSha } : {}),
        }),
      });

      if (!putRes.ok) {
        const errData = (await putRes.json().catch(() => ({}))) as { message?: string };
        res.status(putRes.status).json({
          error: errData.message || 'Failed to push index.html to GitHub.',
        });
        return;
      }

      res.json({
        ok: true,
        repoUrl: `https://github.com/${owner}/${repoName}`,
        pagesUrl: `https://${owner}.github.io/${repoName}/`,
      });
    } catch (error) {
      console.error('GitHub deploy error:', error);
      res.status(502).json({ error: 'Unexpected error pushing to GitHub.' });
    }
  });

  // Contact form handler
  app.post('/api/contact', (req: Request, res: Response) => {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!name || !email || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please provide your name, a valid email address, and a message.' });
      return;
    }

    const record = {
      id: crypto.randomUUID(),
      name,
      email,
      subject: subject || 'Portfolio Inquiry',
      message,
      createdAt: new Date().toISOString(),
    };
    contactMessages.unshift(record);
    if (contactMessages.length > 50) contactMessages.pop();

    res.json({
      ok: true,
      id: record.id,
      receivedAt: record.createdAt,
    });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Portfolio server running on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
