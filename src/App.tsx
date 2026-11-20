import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Code2,
  Copy,
  Github,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  Menu,
  Moon,
  Phone,
  RefreshCw,
  Send,
  Sun,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  CREDENTIALS,
  EXPERIENCES,
  FEATURED_PROJECTS,
  PROFILE,
  PROOF_METRICS,
  SKILL_GROUPS,
  type FeaturedProject,
  type GitHubRepoSummary,
} from './data/portfolioData';
import { ProjectLightbox, type LightboxProject } from './components/ProjectLightbox';
import { ResumeModal } from './components/ResumeModal';
import { DeployModal } from './components/DeployModal';

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

const CATEGORIES = ['All', 'Full-Stack', 'Frontend', 'Backend', 'Enterprise'] as const;
type ProjectCategoryFilter = (typeof CATEGORIES)[number];

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategoryFilter>('All');

  const [lightboxProject, setLightboxProject] = useState<LightboxProject | null>(null);
  const [lightboxInitialTab, setLightboxInitialTab] = useState<'overview' | 'code'>('overview');
  const [resumeOpen, setResumeOpen] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);

  // Live GitHub integration state
  const [sessionId, setSessionId] = useState<string | null>(() => {
    try {
      return window.sessionStorage.getItem('gh_portfolio_sid');
    } catch {
      return null;
    }
  });
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [liveRepos, setLiveRepos] = useState<GitHubRepoSummary[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [reposError, setReposError] = useState<string | null>(null);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactFeedback, setContactFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<'email' | 'secondaryEmail' | 'phone' | null>(null);
  const [portraitFailed, setPortraitFailed] = useState(false);

  // Theme sync with Tailwind v4 @custom-variant dark
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const fetchOAuthStatus = useCallback(
    async (sidOverride?: string | null) => {
      const sid = sidOverride !== undefined ? sidOverride : sessionId;
      const headers: Record<string, string> = {};
      if (sid) headers['x-github-session'] = sid;
      try {
        const res = await fetch('/api/auth/github/status', { headers });
        if (res.ok) {
          const data = (await res.json()) as OAuthStatus;
          setOauthStatus(data);
        }
      } catch {
        // non-blocking
      }
    },
    [sessionId]
  );

  const fetchLiveRepos = useCallback(
    async (sidOverride?: string | null) => {
      const sid = sidOverride !== undefined ? sidOverride : sessionId;
      setReposLoading(true);
      setReposError(null);
      const headers: Record<string, string> = {};
      if (sid) headers['x-github-session'] = sid;

      try {
        const res = await fetch(`/api/github/profile/${encodeURIComponent(PROFILE.githubUsername)}`, {
          headers,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Unable to sync GitHub repositories.');
        }
        setLiveRepos(Array.isArray(data.repos) ? data.repos : []);
      } catch (err) {
        setReposError(err instanceof Error ? err.message : 'GitHub sync unavailable.');
      } finally {
        setReposLoading(false);
      }
    },
    [sessionId]
  );

  useEffect(() => {
    void fetchOAuthStatus();
    void fetchLiveRepos();
  }, [fetchOAuthStatus, fetchLiveRepos]);

  // Listen for GitHub OAuth popup completion via postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const nextSid = typeof event.data.sessionId === 'string' ? event.data.sessionId : null;
        if (nextSid) {
          setSessionId(nextSid);
          try {
            window.sessionStorage.setItem('gh_portfolio_sid', nextSid);
          } catch {
            // ignore storage errors
          }
        }
        setOauthError(null);
        void fetchOAuthStatus(nextSid);
        void fetchLiveRepos(nextSid);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setOauthError(String(event.data.error || 'GitHub authentication failed.'));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchOAuthStatus, fetchLiveRepos]);

  const handleConnectOAuth = async () => {
    setOauthError(null);
    try {
      const res = await fetch('/api/auth/github/url');
      const data = await res.json();
      if (!res.ok || !data.url) {
        setOauthError(data.error || 'GitHub OAuth is not configured on the server yet.');
        return;
      }
      const popup = window.open(data.url, 'github_oauth_popup', 'width=600,height=720');
      if (!popup) {
        setOauthError('Popup blocked by browser. Please allow popups and try again.');
      }
    } catch {
      setOauthError('Failed to start GitHub OAuth flow.');
    }
  };

  const handleDisconnectOAuth = async () => {
    const headers: Record<string, string> = {};
    if (sessionId) headers['x-github-session'] = sessionId;
    await fetch('/api/auth/github/logout', { method: 'POST', headers });
    setSessionId(null);
    try {
      window.sessionStorage.removeItem('gh_portfolio_sid');
    } catch {
      // ignore
    }
    await fetchOAuthStatus(null);
    await fetchLiveRepos(null);
  };

  const filteredProjects = useMemo(() => {
    if (selectedCategory === 'All') return FEATURED_PROJECTS;
    return FEATURED_PROJECTS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  const openCuratedProject = (project: FeaturedProject, tab: 'overview' | 'code' = 'overview') => {
    setLightboxInitialTab(tab);
    setLightboxProject({
      title: project.title,
      tagline: project.tagline,
      category: project.category,
      year: project.year,
      description: project.description,
      architectureHighlights: project.architectureHighlights,
      stack: project.stack,
      coverImage: project.coverImage,
      githubRepo: project.githubRepo,
      githubUrl: project.githubUrl,
      liveUrl: project.liveUrl,
    });
  };

  const openGitHubRepo = (repo: GitHubRepoSummary, tab: 'overview' | 'code' = 'code') => {
    const matched = FEATURED_PROJECTS.find(
      (p) => p.githubRepo?.toLowerCase() === repo.full_name.toLowerCase()
    );
    if (matched) {
      openCuratedProject(matched, tab);
      return;
    }
    setLightboxInitialTab(tab);
    setLightboxProject({
      title: repo.name,
      tagline: repo.description || 'Public GitHub repository by Nilesh Chikhle.',
      category: repo.language || 'Repository',
      year: new Date(repo.updated_at).getFullYear().toString(),
      description:
        repo.description ||
        `Source repository hosted on GitHub under ${repo.full_name}. Inspect live commits, README documentation, and source files directly.`,
      architectureHighlights: [],
      stack: [repo.language || 'Source', ...repo.topics].filter(Boolean),
      githubRepo: repo.full_name,
      githubUrl: repo.html_url,
      liveUrl: repo.homepage || undefined,
    });
  };

  const handleCopy = async (field: 'email' | 'secondaryEmail' | 'phone', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // ignore
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitting(true);
    setContactFeedback(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Please check your input and try again.');
      }
      setContactFeedback({
        type: 'success',
        text: 'Message received. Thank you for reaching out—Nilesh will reply shortly.',
      });
      setContactForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setContactFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to send message right now.',
      });
    } finally {
      setContactSubmitting(false);
    }
  };

  const navLinks = [
    { href: '#work', label: 'Work' },
    { href: '#experience', label: 'Experience' },
    { href: '#skills', label: 'Skills' },
    { href: '#credentials', label: 'Credentials' },
    { href: '#contact', label: 'Contact' },
  ];

  return (
    <div className="min-h-screen print:min-h-0 bg-[#FAFAFA] dark:bg-[#0B0C0F] print:bg-white text-[#111111] dark:text-[#F4F4F5] transition-colors duration-200">
      {/* Top Navigation Bar — Strict 3-Zone Contract */}
      <header className="sticky top-0 z-40 print:hidden border-b border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA]/95 dark:bg-[#0B0C0F]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-[#111111] dark:text-white whitespace-nowrap shrink-0"
          >
            {PROFILE.name}
          </a>

          {/* Zone 2: 5 Single-Line Navigation Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#52525B] dark:text-[#A1A1AA]"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-[#111111] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Zone 3: 1 Primary Action (+ Mobile Menu Button on small screens) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setResumeOpen(true)}
              className="px-4 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              View Resume
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#27272A] text-[#111111] dark:text-white cursor-pointer"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileNavOpen && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden border-t border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#111318] px-6 py-4"
          >
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="py-1.5 text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main id="top" className="mx-auto max-w-6xl px-6 print:hidden">
        {/* Hero Split-Screen Section */}
        <section className="pt-14 pb-12 lg:pt-20 lg:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left Column: Typographic Hierarchy */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
              <div className="space-y-5">
                <p className="text-xs font-medium text-[#52525B] dark:text-[#A1A1AA]">
                  {PROFILE.role} · <span className="text-[#2563EB] dark:text-[#60A5FA]">{PROFILE.availability}</span>
                </p>

                <h1 className="font-display text-[clamp(2.25rem,4vw,3.5rem)] font-bold leading-[1.06] tracking-tight text-[#111111] dark:text-white text-balance">
                  {PROFILE.headline}
                </h1>

                <p className="max-w-2xl text-base leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                  {PROFILE.bio}
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="#work"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#111111] dark:bg-[#2563EB] hover:opacity-90 rounded-lg transition-opacity whitespace-nowrap"
                  >
                    <span>Explore Selected Work</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setDeployOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#111111] dark:text-[#F4F4F5] border border-[#E4E4E7] dark:border-[#27272A] hover:bg-[#F4F4F5] dark:hover:bg-[#181A20] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <UploadCloud className="h-4 w-4" />
                    <span>GitHub Sync &amp; Deploy</span>
                  </button>
                </div>

                {/* Quiet Social & Utility Links */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#52525B] dark:text-[#A1A1AA]">
                  <a
                    href={PROFILE.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-[#111111] dark:hover:text-white transition-colors whitespace-nowrap"
                  >
                    <Github className="h-4 w-4" />
                    <span>github.com/nileshchikhle1102</span>
                  </a>
                  <a
                    href={PROFILE.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-[#111111] dark:hover:text-white transition-colors whitespace-nowrap"
                  >
                    <Linkedin className="h-4 w-4" />
                    <span>LinkedIn</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setDarkMode((prev) => !prev)}
                    aria-label="Switch color theme"
                    className="inline-flex items-center gap-1.5 hover:text-[#111111] dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Matching-Height Studio Portrait */}
            <div className="lg:col-span-5">
              <div className="relative h-full min-h-[340px] overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-[#E4E4E7] dark:bg-[#181A20]">
                {!portraitFailed ? (
                  <img
                    src={PROFILE.portraitImage}
                    alt="Portrait of Nilesh Chikhle"
                    referrerPolicy="no-referrer"
                    onError={() => setPortraitFailed(true)}
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-8 text-center">
                    <span className="font-display text-2xl font-semibold text-[#52525B]">
                      Nilesh Chikhle
                    </span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-5 pb-4 pt-12 text-white">
                  <p className="text-sm font-medium">{PROFILE.name}</p>
                  <p className="text-xs text-white/85">
                    5 Years Experience · Immediate Joiner · {PROFILE.location}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Full-Width 4-Column Proof Strip */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-y border-[#E4E4E7] dark:border-[#27272A] divide-y sm:divide-y-0 sm:divide-x divide-[#E4E4E7] dark:divide-[#27272A]">
            {PROOF_METRICS.map((metric) => (
              <div key={metric.label} className="py-6 sm:px-6 first:sm:pl-0 last:sm:pr-0">
                <p className="font-mono text-2xl font-semibold tracking-tight text-[#111111] dark:text-white tabular-nums">
                  {metric.value}
                </p>
                <p className="mt-1 text-sm font-medium text-[#111111] dark:text-[#E4E4E7]">
                  {metric.label}
                </p>
                <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
                  {metric.context}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Selected Projects — Editorial Bento Grid */}
        <section id="work" className="py-16 lg:py-20 border-b border-[#E4E4E7] dark:border-[#27272A]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
                01. Selected Work
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111] dark:text-white text-balance">
                Production systems &amp; open-source projects
              </h2>
            </div>

            {/* Interactive Category Filter Control */}
            <div
              role="tablist"
              aria-label="Filter projects by domain"
              className="flex items-center gap-1 p-1 rounded-lg bg-[#F4F4F5] dark:bg-[#181A20] overflow-x-auto max-w-full"
            >
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategory === category
                      ? 'bg-white dark:bg-[#27272A] text-[#111111] dark:text-white shadow-xs'
                      : 'text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Bento Showcase Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProjects.map((project, index) => {
              const isFlagship = project.featured && selectedCategory === 'All' && index === 0;
              return (
                <article
                  key={project.id}
                  onClick={() => openCuratedProject(project, 'overview')}
                  className={`group flex flex-col overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#111318] transition-colors hover:border-[#A1A1AA] dark:hover:border-[#52525B] cursor-pointer ${
                    isFlagship ? 'lg:col-span-2 lg:grid lg:grid-cols-12' : ''
                  }`}
                >
                  {/* Visual Thumbnail */}
                  <div
                    className={`overflow-hidden bg-[#F4F4F5] dark:bg-[#181A20] ${
                      isFlagship ? 'lg:col-span-6 aspect-4/3 lg:aspect-auto lg:h-full' : 'aspect-16/10'
                    }`}
                  >
                    <img
                      src={project.coverImage}
                      alt={project.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>

                  {/* Editorial Card Body */}
                  <div
                    className={`flex flex-col justify-between p-6 md:p-7 ${
                      isFlagship ? 'lg:col-span-6' : 'flex-1'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#71717A] dark:text-[#A1A1AA] font-mono">
                        <span>{project.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{project.year}</span>
                        <span aria-hidden="true">·</span>
                        <span>{project.stack.slice(0, 3).join(' / ')}</span>
                      </div>

                      <h3 className="font-display text-xl md:text-2xl font-semibold tracking-tight text-[#111111] dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors">
                        {project.title}
                      </h3>

                      <p className="text-sm font-medium text-[#27272A] dark:text-[#E4E4E7]">
                        {project.tagline}
                      </p>

                      <p className="text-sm leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                        {project.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#E4E4E7] dark:border-[#27272A] flex flex-wrap items-center justify-between gap-4 text-xs font-medium">
                      <span className="inline-flex items-center gap-1.5 text-[#111111] dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors">
                        <span>Read case study</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>

                      <div
                        className="flex items-center gap-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {project.githubRepo && (
                          <button
                            type="button"
                            onClick={() => openCuratedProject(project, 'code')}
                            className="inline-flex items-center gap-1.5 text-[#52525B] dark:text-[#A1A1AA] hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <Code2 className="h-3.5 w-3.5" />
                            <span>Inspect code</span>
                          </button>
                        )}
                        {project.liveUrl && (
                          <a
                            href={project.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#2563EB] dark:text-[#60A5FA] hover:underline whitespace-nowrap"
                          >
                            <span>Live Demo</span>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Live GitHub Repositories Directory */}
          <div className="mt-14 pt-10 border-t border-[#E4E4E7] dark:border-[#27272A]">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-[#111111] dark:text-white">
                  Live GitHub Repositories
                </h3>
                <p className="mt-1 text-sm text-[#52525B] dark:text-[#A1A1AA]">
                  Synced directly from{' '}
                  <a
                    href={PROFILE.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-[#2563EB] dark:text-[#60A5FA] hover:underline"
                  >
                    github.com/{PROFILE.githubUsername}
                  </a>
                  . Select any repository to inspect its live source tree and README.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void fetchLiveRepos()}
                disabled={reposLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#52525B] dark:text-[#A1A1AA] border border-[#E4E4E7] dark:border-[#27272A] hover:text-[#111111] dark:hover:text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${reposLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {reposLoading ? (
              <div className="flex items-center gap-2.5 py-8 text-sm text-[#71717A]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading repositories from GitHub...</span>
              </div>
            ) : reposError ? (
              <div className="rounded-xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#111318] p-5 text-sm text-[#52525B] dark:text-[#A1A1AA]">
                {reposError}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#111318]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E4E4E7] dark:border-[#27272A] text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
                      <th className="py-3 px-4">Repository</th>
                      <th className="py-3 px-4">Language</th>
                      <th className="py-3 px-4">Updated</th>
                      <th className="py-3 px-4 text-right">Code Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#27272A] text-sm">
                    {liveRepos.map((repo) => (
                      <tr
                        key={repo.id}
                        className="hover:bg-[#FAFAFA] dark:hover:bg-[#181A20] transition-colors"
                      >
                        <td className="py-3.5 px-4 max-w-md">
                          <div className="font-mono text-xs font-medium text-[#111111] dark:text-white">
                            {repo.name}
                          </div>
                          {repo.description && (
                            <p className="mt-0.5 text-xs text-[#71717A] dark:text-[#A1A1AA] line-clamp-1">
                              {repo.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-[#52525B] dark:text-[#A1A1AA] whitespace-nowrap">
                          {repo.language || 'Documentation'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-[#71717A] dark:text-[#A1A1AA] whitespace-nowrap tabular-nums">
                          {new Date(repo.updated_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openGitHubRepo(repo, 'code')}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2563EB] dark:text-[#60A5FA] hover:underline cursor-pointer"
                          >
                            <Code2 className="h-3.5 w-3.5" />
                            <span>Inspect Code</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Professional Experience */}
        <section id="experience" className="py-16 lg:py-20 border-b border-[#E4E4E7] dark:border-[#27272A]">
          <div className="space-y-2 mb-10">
            <p className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
              02. Experience
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111] dark:text-white">
              Career progression &amp; engineering leadership
            </h2>
          </div>

          <div className="divide-y divide-[#E4E4E7] dark:divide-[#27272A] border-t border-[#E4E4E7] dark:border-[#27272A]">
            {EXPERIENCES.map((exp) => (
              <div key={exp.id} className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-8">
                <div className="lg:col-span-4 space-y-1">
                  <p className="font-mono text-xs font-medium text-[#2563EB] dark:text-[#60A5FA] tabular-nums">
                    {exp.period}
                  </p>
                  <p className="text-base font-semibold text-[#111111] dark:text-white">
                    {exp.company}
                  </p>
                  <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">{exp.location}</p>
                </div>

                <div className="lg:col-span-8 space-y-4">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-[#111111] dark:text-white">
                      {exp.role}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                      {exp.summary}
                    </p>
                  </div>

                  <ul className="space-y-2 text-sm text-[#27272A] dark:text-[#D4D4D8]">
                    {exp.highlights.map((item, idx) => (
                      <li key={idx} className="flex gap-3 leading-relaxed">
                        <span className="font-mono text-xs text-[#71717A] pt-0.5 tabular-nums">
                          —
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="pt-1 text-xs font-mono text-[#71717A] dark:text-[#A1A1AA]">
                    {exp.stack.join(' · ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Technical Stack & Engineering Practice */}
        <section id="skills" className="py-16 lg:py-20 border-b border-[#E4E4E7] dark:border-[#27272A]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-4">
              <p className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
                03. Capabilities &amp; Stack
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111] dark:text-white text-balance">
                Full-stack craft built for production longevity
              </h2>
              <p className="text-sm leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                {PROFILE.aboutExtended}
              </p>
            </div>

            <div className="lg:col-span-8 divide-y divide-[#E4E4E7] dark:divide-[#27272A] border-y border-[#E4E4E7] dark:border-[#27272A]">
              {SKILL_GROUPS.map((group) => (
                <div
                  key={group.category}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 py-5 items-baseline"
                >
                  <h3 className="sm:col-span-4 text-sm font-semibold text-[#111111] dark:text-white">
                    {group.category}
                  </h3>
                  <p className="sm:col-span-8 text-sm leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                    {group.items.join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Education, Certifications & Recognition — Clean 3-Column Row */}
        <section id="credentials" className="py-16 lg:py-20 border-b border-[#E4E4E7] dark:border-[#27272A]">
          <div className="space-y-2 mb-10">
            <p className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
              04. Education, Certifications &amp; Recognition
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111] dark:text-white">
              Academic foundation &amp; verified honors
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CREDENTIALS.map((cred) => (
              <div
                key={cred.id}
                className="flex flex-col justify-between rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#111318] p-6"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#71717A] dark:text-[#A1A1AA] tabular-nums">
                    <span>{cred.kind}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#2563EB] dark:text-[#60A5FA] font-medium">{cred.period}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-[#111111] dark:text-white leading-snug">
                    {cred.title}
                  </h3>
                  <p className="text-sm font-medium text-[#3F3F46] dark:text-[#D4D4D8]">
                    {cred.issuer}
                  </p>
                </div>
                <p className="mt-4 pt-4 border-t border-[#E4E4E7] dark:border-[#27272A] text-xs leading-relaxed text-[#71717A] dark:text-[#A1A1AA]">
                  {cred.details}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
                  05. Contact · <span className="text-[#2563EB] dark:text-[#60A5FA]">Immediate Joiner</span>
                </p>
                <h2 className="font-display text-3xl font-bold tracking-tight text-[#111111] dark:text-white text-balance">
                  Currently open to new senior engineering opportunities
                </h2>
                <p className="text-sm leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                  Actively interviewing for Senior Full-Stack Engineer (React.js / Node.js / PHP),
                  API Architecture, Enterprise CRM, and MuleSoft Integration roles. Available to join immediately.
                </p>
              </div>

              <div className="divide-y divide-[#E4E4E7] dark:divide-[#27272A] border-y border-[#E4E4E7] dark:border-[#27272A]">
                <div className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Mail className="h-4 w-4 shrink-0 text-[#71717A]" />
                    <a
                      href={`mailto:${PROFILE.email}`}
                      className="text-sm text-[#111111] dark:text-white hover:text-[#2563EB] truncate"
                    >
                      {PROFILE.email}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopy('email', PROFILE.email)}
                    className="inline-flex items-center gap-1 text-xs text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white shrink-0 cursor-pointer"
                  >
                    {copiedField === 'email' ? (
                      <Check className="h-3.5 w-3.5 text-[#2563EB]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedField === 'email' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Mail className="h-4 w-4 shrink-0 text-[#71717A]" />
                    <a
                      href={`mailto:${PROFILE.secondaryEmail}`}
                      className="text-sm text-[#52525B] dark:text-[#D4D4D8] hover:text-[#2563EB] truncate"
                    >
                      {PROFILE.secondaryEmail}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopy('secondaryEmail', PROFILE.secondaryEmail)}
                    className="inline-flex items-center gap-1 text-xs text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white shrink-0 cursor-pointer"
                  >
                    {copiedField === 'secondaryEmail' ? (
                      <Check className="h-3.5 w-3.5 text-[#2563EB]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedField === 'secondaryEmail' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Phone className="h-4 w-4 shrink-0 text-[#71717A]" />
                    <span className="text-sm font-mono text-[#111111] dark:text-white tabular-nums">
                      {PROFILE.phone}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopy('phone', PROFILE.phone)}
                    className="inline-flex items-center gap-1 text-xs text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white shrink-0 cursor-pointer"
                  >
                    {copiedField === 'phone' ? (
                      <Check className="h-3.5 w-3.5 text-[#2563EB]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedField === 'phone' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 py-4">
                  <MapPin className="h-4 w-4 shrink-0 text-[#71717A]" />
                  <span className="text-sm text-[#111111] dark:text-white">{PROFILE.location}</span>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleContactSubmit}
              className="lg:col-span-7 rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#111318] p-6 md:p-8 space-y-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="contact-name" className="block text-xs font-medium text-[#52525B] dark:text-[#A1A1AA]">
                    Your Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Alex Rivera"
                    className="w-full rounded-lg border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#0D0F13] px-3.5 py-2.5 text-sm text-[#111111] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="contact-email" className="block text-xs font-medium text-[#52525B] dark:text-[#A1A1AA]">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="alex@company.com"
                    className="w-full rounded-lg border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#0D0F13] px-3.5 py-2.5 text-sm text-[#111111] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-subject" className="block text-xs font-medium text-[#52525B] dark:text-[#A1A1AA]">
                  Subject
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Engineering opportunity or project inquiry"
                  className="w-full rounded-lg border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#0D0F13] px-3.5 py-2.5 text-sm text-[#111111] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-message" className="block text-xs font-medium text-[#52525B] dark:text-[#A1A1AA]">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={4}
                  required
                  value={contactForm.message}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Share context about your team, role, or project..."
                  className="w-full rounded-lg border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#0D0F13] px-3.5 py-2.5 text-sm text-[#111111] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              {contactFeedback && (
                <p
                  role="status"
                  className={`text-xs font-medium ${
                    contactFeedback.type === 'success'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {contactFeedback.text}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  {contactSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>Send Message</span>
                </button>
                <a
                  href={`mailto:${PROFILE.email}`}
                  className="text-xs font-medium text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white"
                >
                  Or email directly →
                </a>
              </div>
            </form>
          </div>
        </section>
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-[#E4E4E7] dark:border-[#27272A] py-8 print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-[#71717A] dark:text-[#A1A1AA]">
          <p>© {new Date().getFullYear()} {PROFILE.name}. Built with React, TypeScript &amp; Node.js.</p>
          <div className="flex flex-wrap items-center gap-5">
            <a
              href={PROFILE.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#111111] dark:hover:text-white transition-colors"
            >
              GitHub
            </a>
            <a
              href={PROFILE.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#111111] dark:hover:text-white transition-colors"
            >
              LinkedIn
            </a>
            <button
              type="button"
              onClick={() => setResumeOpen(true)}
              className="hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={() => setDeployOpen(true)}
              className="hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
            >
              Deploy &amp; Export
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ProjectLightbox
        project={lightboxProject}
        sessionId={sessionId}
        initialTab={lightboxInitialTab}
        onClose={() => setLightboxProject(null)}
      />
      <ResumeModal open={resumeOpen} onClose={() => setResumeOpen(false)} />
      <DeployModal
        open={deployOpen}
        oauthStatus={oauthStatus}
        sessionId={sessionId}
        onConnectOAuth={handleConnectOAuth}
        onDisconnectOAuth={handleDisconnectOAuth}
        oauthError={oauthError}
        onClose={() => setDeployOpen(false)}
      />
    </div>
  );
}
