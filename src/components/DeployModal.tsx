import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Github,
  Loader2,
  LogOut,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  GITHUB_PAGES_WORKFLOW,
  generateStandalonePortfolioHtml,
} from '../utils/exportPortfolio';

interface OAuthStatus {
  configured: boolean;
  connected: boolean;
  callbackUrl: string;
  user: {
    login: string;
    name: string | null;
    avatar_url: string;
  } | null;
}

interface DeployModalProps {
  open: boolean;
  oauthStatus: OAuthStatus | null;
  sessionId: string | null;
  onConnectOAuth: () => Promise<void>;
  onDisconnectOAuth: () => Promise<void>;
  oauthError: string | null;
  onClose: () => void;
}

export const DeployModal: React.FC<DeployModalProps> = ({
  open,
  oauthStatus,
  sessionId,
  onConnectOAuth,
  onDisconnectOAuth,
  oauthError,
  onClose,
}) => {
  const [targetRepo, setTargetRepo] = useState('myportfolio');
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ repoUrl: string; pagesUrl: string } | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [copiedCallback, setCopiedCallback] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDirectPush = async () => {
    setDeploying(true);
    setDeployError(null);
    setDeployResult(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionId) headers['x-github-session'] = sessionId;

      const res = await fetch('/api/github/deploy', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          repoName: targetRepo.trim() || 'myportfolio',
          htmlContent: generateStandalonePortfolioHtml(),
          commitMessage: 'Deploy optimized portfolio with verified projects and experience',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not publish to GitHub.');
      }
      setDeployResult({ repoUrl: data.repoUrl, pagesUrl: data.pagesUrl });
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : 'Deployment failed.');
    } finally {
      setDeploying(false);
    }
  };

  const handleCopyCallback = async () => {
    const url = oauthStatus?.callbackUrl || `${window.location.origin}/auth/github/callback`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCallback(true);
      window.setTimeout(() => setCopiedCallback(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deploy-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#111318]">
        <div className="flex items-center justify-between gap-4 border-b border-[#E4E4E7] dark:border-[#27272A] px-6 py-5">
          <div>
            <h3 id="deploy-modal-title" className="text-lg font-semibold text-[#111111] dark:text-white">
              GitHub OAuth &amp; Portfolio Deployment
            </h3>
            <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
              Connect GitHub for private code access &amp; direct pushes, or export a production bundle.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close deployment panel"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#27272A] text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h4 className="text-sm font-semibold text-[#111111] dark:text-white">
                01. GitHub OAuth Connection
              </h4>
              <span className="text-xs font-mono text-[#71717A] dark:text-[#A1A1AA]">
                {oauthStatus?.connected
                  ? `Connected as @${oauthStatus.user?.login}`
                  : oauthStatus?.configured
                    ? 'Ready to connect'
                    : 'Awaiting OAuth app secrets'}
              </span>
            </div>

            {oauthStatus?.connected ? (
              <div className="space-y-4 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E4E4E7] dark:border-[#27272A] p-4 bg-[#FAFAFA] dark:bg-[#0D0F13]">
                  <div className="flex items-center gap-3">
                    <Github className="h-5 w-5 text-[#111111] dark:text-white" />
                    <div>
                      <p className="text-sm font-medium text-[#111111] dark:text-white">
                        {oauthStatus.user?.name || oauthStatus.user?.login}
                      </p>
                      <p className="text-xs text-[#71717A] font-mono">
                        @{oauthStatus.user?.login} · Repo read/write scope active
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onDisconnectOAuth()}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Disconnect</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={targetRepo}
                    onChange={(e) => setTargetRepo(e.target.value)}
                    placeholder="myportfolio"
                    aria-label="Target GitHub repository name"
                    className="flex-1 rounded-lg border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#0D0F13] px-3.5 py-2 text-sm font-mono text-[#111111] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <button
                    type="button"
                    disabled={deploying}
                    onClick={() => void handleDirectPush()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {deploying ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="h-3.5 w-3.5" />
                    )}
                    <span>Push to GitHub</span>
                  </button>
                </div>

                {deployError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{deployError}</p>
                )}
                {deployResult && (
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#111111] dark:text-[#E4E4E7]">
                    <span>Pushed index.html successfully.</span>
                    <a
                      href={deployResult.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#2563EB] hover:underline"
                    >
                      <span>View Repo</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href={deployResult.pagesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#2563EB] hover:underline"
                    >
                      <span>GitHub Pages</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[#52525B] dark:text-[#A1A1AA] leading-relaxed">
                  Public repositories for <span className="font-mono text-[#111111] dark:text-white">nileshchikhle1102</span> are already synced live. Connect GitHub OAuth to unlock private repositories, 5,000 req/hr API quota, and direct commits to <span className="font-mono">myportfolio</span>.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void onConnectOAuth()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#111111] dark:bg-[#2563EB] hover:opacity-90 rounded-lg transition-opacity whitespace-nowrap cursor-pointer"
                  >
                    <Github className="h-3.5 w-3.5" />
                    <span>Connect with GitHub</span>
                  </button>
                </div>

                {oauthError && (
                  <div className="rounded-xl border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#0D0F13] p-4 space-y-2.5 text-xs">
                    <p className="font-medium text-[#111111] dark:text-white">{oauthError}</p>
                    <p className="text-[#52525B] dark:text-[#A1A1AA]">
                      Register a GitHub OAuth App at{' '}
                      <a
                        href="https://github.com/settings/developers"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2563EB] hover:underline"
                      >
                        github.com/settings/developers
                      </a>{' '}
                      with the callback URL below, then add <code className="font-mono">GITHUB_CLIENT_ID</code> and{' '}
                      <code className="font-mono">GITHUB_CLIENT_SECRET</code> in AI Studio Secrets:
                    </p>
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#111318] px-3 py-2 font-mono text-[11px] text-[#111111] dark:text-[#E4E4E7]">
                      <span className="truncate">
                        {oauthStatus?.callbackUrl || `${window.location.origin}/auth/github/callback`}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleCopyCallback()}
                        className="inline-flex items-center gap-1 shrink-0 text-[#2563EB] hover:underline cursor-pointer"
                      >
                        {copiedCallback ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedCallback ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <hr className="border-[#E4E4E7] dark:border-[#27272A]" />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[#111111] dark:text-white">
              02. Instant Production Exports
            </h4>
            <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">
              Download a zero-dependency static build or the GitHub Actions Pages workflow to deploy to{' '}
              <span className="font-mono text-xs">nileshchikhle1102.github.io/myportfolio</span> immediately.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() =>
                  downloadFile('index.html', generateStandalonePortfolioHtml(), 'text/html;charset=utf-8')
                }
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#111111] dark:text-white border border-[#E4E4E7] dark:border-[#27272A] hover:bg-[#F4F4F5] dark:hover:bg-[#1C1E26] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Standalone index.html</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadFile('deploy.yml', GITHUB_PAGES_WORKFLOW, 'text/yaml;charset=utf-8')
                }
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#111111] dark:text-white border border-[#E4E4E7] dark:border-[#27272A] hover:bg-[#F4F4F5] dark:hover:bg-[#1C1E26] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download GitHub Pages Workflow</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
