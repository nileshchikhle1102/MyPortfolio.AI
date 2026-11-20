import {
  CREDENTIALS,
  EXPERIENCES,
  FEATURED_PROJECTS,
  PROFILE,
  PROOF_METRICS,
  SKILL_GROUPS,
} from '../data/portfolioData';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateStandalonePortfolioHtml(): string {
  const projectCards = FEATURED_PROJECTS.map(
    (p) => `
      <article class="card">
        <div class="meta">${esc(p.category)} · ${esc(p.year)} · ${esc(p.stack.slice(0, 4).join(' / '))}</div>
        <h3>${esc(p.title)}</h3>
        <p class="tagline">${esc(p.tagline)}</p>
        <p>${esc(p.description)}</p>
        <div class="links">
          ${p.githubUrl ? `<a href="${esc(p.githubUrl)}" target="_blank" rel="noopener noreferrer">Source on GitHub →</a>` : ''}
          ${p.liveUrl ? `<a href="${esc(p.liveUrl)}" target="_blank" rel="noopener noreferrer">Live Demo →</a>` : ''}
        </div>
      </article>`
  ).join('\n');

  const experienceRows = EXPERIENCES.map(
    (e) => `
      <div class="row">
        <div class="row-left">
          <div class="period">${esc(e.period)}</div>
          <div class="muted">${esc(e.location)}</div>
        </div>
        <div class="row-right">
          <h3>${esc(e.role)} — ${esc(e.company)}</h3>
          <p>${esc(e.summary)}</p>
          <ul>${e.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        </div>
      </div>`
  ).join('\n');

  const skillRows = SKILL_GROUPS.map(
    (g) => `
      <div class="skill-row">
        <div class="skill-cat">${esc(g.category)}</div>
        <div class="skill-list">${esc(g.items.join(' · '))}</div>
      </div>`
  ).join('\n');

  const credentialRows = CREDENTIALS.map(
    (cred) => `
      <div class="edu-row">
        <div>
          <div class="meta">${esc(cred.kind)} · ${esc(cred.period)}</div>
          <h3>${esc(cred.title)}</h3>
          <div class="muted">${esc(cred.issuer)} — ${esc(cred.details)}</div>
        </div>
      </div>`
  ).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(PROFILE.name)} — ${esc(PROFILE.role)}</title>
  <meta name="description" content="${esc(PROFILE.bio)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    :root { --bg:#fafafa; --surface:#ffffff; --ink:#111111; --muted:#52525b; --border:#e4e4e7; --accent:#2563eb; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:'DM Sans',system-ui,sans-serif; background:var(--bg); color:var(--ink); line-height:1.6; }
    h1,h2,h3 { font-family:'Bricolage Grotesque',system-ui,sans-serif; letter-spacing:-0.02em; margin:0; }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    .wrap { max-width:1120px; margin:0 auto; padding:0 24px; }
    header { border-bottom:1px solid var(--border); background:var(--surface); }
    .nav { display:flex; align-items:center; justify-content:space-between; gap:24px; height:68px; }
    .brand { font-family:'Bricolage Grotesque',sans-serif; font-weight:700; color:var(--ink); }
    .nav-links { display:flex; gap:24px; font-size:14px; }
    .nav-links a { color:var(--muted); }
    .hero { padding:72px 0 48px; }
    .kicker { font-size:13px; color:var(--muted); margin-bottom:14px; }
    h1 { font-size:clamp(2.2rem,4vw,3.4rem); line-height:1.08; max-width:22ch; text-wrap:balance; }
    .lead { color:var(--muted); max-width:65ch; margin:20px 0 28px; font-size:16px; }
    .metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
    .metric { padding:24px 16px; border-right:1px solid var(--border); }
    .metric:last-child { border-right:none; }
    .metric strong { display:block; font-family:'JetBrains Mono',monospace; font-size:24px; }
    .metric span { font-size:13px; color:var(--muted); }
    section { padding:64px 0; border-bottom:1px solid var(--border); }
    h2 { font-size:28px; margin-bottom:28px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:20px; }
    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:24px; }
    .meta { font-size:12px; color:var(--muted); font-family:'JetBrains Mono',monospace; margin-bottom:10px; }
    .tagline { font-weight:500; margin:6px 0 10px; color:var(--ink); }
    .links { display:flex; gap:16px; margin-top:16px; font-size:14px; font-weight:500; flex-wrap:wrap; }
    .row { display:grid; grid-template-columns:220px 1fr; gap:24px; padding:24px 0; border-top:1px solid var(--border); }
    .period { font-family:'JetBrains Mono',monospace; font-size:13px; }
    .muted { color:var(--muted); font-size:14px; }
    .skill-row { display:grid; grid-template-columns:220px 1fr; gap:20px; padding:16px 0; border-top:1px solid var(--border); }
    .skill-cat { font-weight:600; }
    .skill-list { color:var(--muted); }
    .edu-row { padding:18px 0; border-top:1px solid var(--border); }
    footer { padding:36px 0; color:var(--muted); font-size:14px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:16px; }
    @media (max-width:720px) { .row,.skill-row { grid-template-columns:1fr; } .metric { border-right:none; border-bottom:1px solid var(--border); } }
  </style>
</head>
<body>
  <header>
    <div class="wrap nav">
      <a href="#" class="brand">${esc(PROFILE.name)}</a>
      <nav class="nav-links">
        <a href="#work">Work</a>
        <a href="#experience">Experience</a>
        <a href="#skills">Skills</a>
        <a href="#credentials">Credentials</a>
        <a href="#contact">Contact</a>
      </nav>
    </div>
  </header>
  <main class="wrap">
    <section class="hero" style="border-bottom:none;">
      <div class="kicker">${esc(PROFILE.role)} · ${esc(PROFILE.availability)}</div>
      <h1>${esc(PROFILE.headline)}</h1>
      <p class="lead">${esc(PROFILE.bio)}</p>
      <div class="links">
        <a href="${esc(PROFILE.githubUrl)}" target="_blank" rel="noopener noreferrer">GitHub →</a>
        <a href="${esc(PROFILE.linkedinUrl)}" target="_blank" rel="noopener noreferrer">LinkedIn →</a>
        <a href="mailto:${esc(PROFILE.email)}">${esc(PROFILE.email)}</a>
      </div>
    </section>
    <div class="metrics">
      ${PROOF_METRICS.map((m) => `<div class="metric"><strong>${esc(m.value)}</strong><span>${esc(m.label)}</span></div>`).join('')}
    </div>
    <section id="work">
      <h2>Selected Projects</h2>
      <div class="grid">${projectCards}</div>
    </section>
    <section id="experience">
      <h2>Experience</h2>
      ${experienceRows}
    </section>
    <section id="skills">
      <h2>Technical Stack</h2>
      ${skillRows}
    </section>
    <section id="credentials">
      <h2>Education, Certifications &amp; Recognition</h2>
      ${credentialRows}
    </section>
    <section id="contact" style="border-bottom:none;">
      <h2>Contact</h2>
      <p class="muted">${esc(PROFILE.availability)} · ${esc(PROFILE.email)} · ${esc(PROFILE.secondaryEmail)} · ${esc(PROFILE.phone)} · ${esc(PROFILE.location)}</p>
    </section>
  </main>
  <footer class="wrap">
    <span>© ${new Date().getFullYear()} ${esc(PROFILE.name)}</span>
    <span>${esc(PROFILE.location)}</span>
  </footer>
</body>
</html>`;
}

export const GITHUB_PAGES_WORKFLOW = `name: Deploy Portfolio to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;
