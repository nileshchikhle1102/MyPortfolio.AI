import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Code2,
  Copy,
  FileCode2,
  Folder,
  GitCommitHorizontal,
  Github,
  Loader2,
  X,
} from 'lucide-react';
import { MarkdownViewer } from './MarkdownViewer';

export interface LightboxProject {
  title: string;
  tagline: string;
  category: string;
  year: string;
  description: string;
  architectureHighlights: string[];
  stack: string[];
  coverImage?: string;
  githubRepo?: string;
  githubUrl?: string;
  liveUrl?: string;
}

interface RepoDetailsResponse {
  readme: string;
  languages: Record<string, number>;
  commits: Array<{
    sha: string;
    message: string;
    date: string;
    author: string;
    html_url: string;
  }>;
}

interface DirItem {
  name: string;
  path: string;
  type: string;
  size: number;
}

interface ContentsResponse {
  kind: 'dir' | 'file';
  path: string;
  name?: string;
  size?: number;
  html_url?: string;
  content?: string;
  items?: DirItem[];
}

interface ProjectLightboxProps {
  project: LightboxProject | null;
  sessionId: string | null;
  initialTab?: 'overview' | 'code';
  onClose: () => void;
}

export const ProjectLightbox: React.FC<ProjectLightboxProps> = ({
  project,
  sessionId,
  initialTab = 'overview',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'code'>(initialTab);
  const [details, setDetails] = useState<RepoDetailsResponse | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [currentPath, setCurrentPath] = useState('');
  const [dirItems, setDirItems] = useState<DirItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    path: string;
    content: string;
    html_url?: string;
  } | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!project) return;
    setActiveTab(project.githubRepo ? initialTab : 'overview');
    setDetails(null);
    setDetailsError(null);
    setCurrentPath('');
    setDirItems([]);
    setSelectedFile(null);
    setCodeError(null);
    setImgFailed(false);
  }, [project, initialTab]);

  useEffect(() => {
    if (!project) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [project, onClose]);

  const buildHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {};
    if (sessionId) h['x-github-session'] = sessionId;
    return h;
  };

  useEffect(() => {
    if (!project?.githubRepo) return;
    const [owner, repo] = project.githubRepo.split('/');
    if (!owner || !repo) return;

    let cancelled = false;
    setDetailsLoading(true);
    setDetailsError(null);

    fetch(`/api/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/details`, {
      headers: buildHeaders(),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Could not load repository metadata.');
        return json as RepoDetailsResponse;
      })
      .then((data) => {
        if (!cancelled) setDetails(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDetailsError(err instanceof Error ? err.message : 'Unable to reach GitHub.');
        }
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [project?.githubRepo, sessionId]);

  const loadRepoPath = async (targetPath: string) => {
    if (!project?.githubRepo) return;
    const [owner, repo] = project.githubRepo.split('/');
    if (!owner || !repo) return;

    setCodeLoading(true);
    setCodeError(null);
    try {
      const res = await fetch(
        `/api/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents?path=${encodeURIComponent(targetPath)}`,
        { headers: buildHeaders() }
      );
      const data = (await res.json()) as ContentsResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Unable to read repository path.');
      }

      if (data.kind === 'dir') {
        setCurrentPath(targetPath);
        setDirItems(data.items || []);
        setSelectedFile(null);
      } else {
        setSelectedFile({
          name: data.name || targetPath.split('/').pop() || 'file',
          path: data.path || targetPath,
          content: data.content || '',
          html_url: data.html_url,
        });
      }
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Failed to load repository files.');
    } finally {
      setCodeLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'code' && project?.githubRepo && dirItems.length === 0 && !selectedFile) {
      void loadRepoPath('');
    }
  }, [activeTab, project?.githubRepo]);

  if (!project) return null;

  const languageEntries = details ? Object.entries(details.languages) : [];
  const totalBytes = languageEntries.reduce((sum, [, bytes]) => sum + bytes, 0);
  const pathSegments = currentPath ? currentPath.split('/').filter(Boolean) : [];

  const handleCopyCode = async () => {
    if (!selectedFile?.content) return;
    try {
      await navigator.clipboard.writeText(selectedFile.content);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // clipboard blocked
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-[#FFFFFF] dark:bg-[#111318]">
        <div className="flex items-start justify-between gap-4 border-b border-[#E4E4E7] dark:border-[#27272A] px-6 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#71717A] dark:text-[#A1A1AA] font-mono">
              <span>{project.category}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{project.year}</span>
              {project.githubRepo && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{project.githubRepo}</span>
                </>
              )}
            </div>
            <h3
              id="lightbox-title"
              className="mt-1 text-2xl font-semibold tracking-tight text-[#111111] dark:text-[#F4F4F5]"
            >
              {project.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close project viewer"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#27272A] text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white hover:bg-[#F4F4F5] dark:hover:bg-[#1C1E26] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4E4E7] dark:border-[#27272A] px-6 py-3 bg-[#FAFAFA] dark:bg-[#0D0F13]">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F4F4F5] dark:bg-[#181A20]">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-[#27272A] text-[#111111] dark:text-white shadow-xs'
                  : 'text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white'
              }`}
            >
              Overview &amp; README
            </button>
            {project.githubRepo && (
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'code'
                    ? 'bg-white dark:bg-[#27272A] text-[#111111] dark:text-white shadow-xs'
                    : 'text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white'
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Browse Source Code</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#111111] dark:text-[#F4F4F5] hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors whitespace-nowrap"
              >
                <Github className="h-3.5 w-3.5" />
                <span>GitHub Repository</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#2563EB] dark:text-[#60A5FA] hover:underline underline-offset-4 whitespace-nowrap"
              >
                <span>Open Live Demo</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {activeTab === 'overview' ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7 space-y-5">
                  <p className="text-base font-medium text-[#111111] dark:text-[#F4F4F5] leading-relaxed">
                    {project.tagline}
                  </p>
                  <p className="text-sm text-[#52525B] dark:text-[#A1A1AA] leading-relaxed">
                    {project.description}
                  </p>

                  {project.architectureHighlights.length > 0 && (
                    <div className="pt-2 space-y-2.5">
                      <h4 className="text-xs font-semibold tracking-wide text-[#71717A] dark:text-[#A1A1AA]">
                        Architecture &amp; Engineering Highlights
                      </h4>
                      <ul className="space-y-2 text-sm text-[#27272A] dark:text-[#D4D4D8]">
                        {project.architectureHighlights.map((point, idx) => (
                          <li key={idx} className="flex gap-2.5 leading-relaxed">
                            <span className="font-mono text-xs text-[#2563EB] dark:text-[#60A5FA] pt-0.5 tabular-nums">
                              0{idx + 1}.
                            </span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2">
                    <h4 className="text-xs font-semibold tracking-wide text-[#71717A] dark:text-[#A1A1AA] mb-1.5">
                      Technology Stack
                    </h4>
                    <p className="text-sm text-[#111111] dark:text-[#E4E4E7]">
                      {project.stack.join(' · ')}
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="aspect-4/3 overflow-hidden rounded-xl border border-[#E4E4E7] dark:border-[#27272A] bg-[#F4F4F5] dark:bg-[#181A20]">
                    {project.coverImage && !imgFailed ? (
                      <img
                        src={project.coverImage}
                        alt={project.title}
                        referrerPolicy="no-referrer"
                        onError={() => setImgFailed(true)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
                        <Code2 className="h-8 w-8 text-[#71717A]" />
                        <span className="mt-2 text-sm font-medium text-[#52525B] dark:text-[#A1A1AA]">
                          {project.title}
                        </span>
                      </div>
                    )}
                  </div>

                  {totalBytes > 0 && (
                    <div className="mt-5 space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#71717A] dark:text-[#A1A1AA]">
                        <span>Live Repository Languages</span>
                        <span className="font-mono tabular-nums">{languageEntries.length} detected</span>
                      </div>
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[#E4E4E7] dark:bg-[#27272A]">
                        {languageEntries.slice(0, 5).map(([lang, bytes], idx) => {
                          const colors = ['#2563EB', '#18181B', '#52525B', '#94A3B8', '#CBD5E1'];
                          const pct = Math.max(2, (bytes / totalBytes) * 100);
                          return (
                            <div
                              key={lang}
                              style={{ width: `${pct}%`, backgroundColor: colors[idx % colors.length] }}
                              title={`${lang}: ${pct.toFixed(1)}%`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#52525B] dark:text-[#A1A1AA] font-mono tabular-nums">
                        {languageEntries.slice(0, 5).map(([lang, bytes]) => (
                          <span key={lang}>
                            {lang} {((bytes / totalBytes) * 100).toFixed(1)}%
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {project.githubRepo && (
                <div className="border-t border-[#E4E4E7] dark:border-[#27272A] pt-6 space-y-6">
                  {detailsLoading ? (
                    <div className="flex items-center gap-2.5 text-sm text-[#71717A]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Fetching live README and commits from GitHub...</span>
                    </div>
                  ) : detailsError ? (
                    <p className="text-sm text-[#71717A] dark:text-[#A1A1AA]">
                      Live GitHub README unavailable right now ({detailsError}).
                    </p>
                  ) : (
                    <>
                      {details && details.commits.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold tracking-wide text-[#71717A] dark:text-[#A1A1AA]">
                            Recent Repository Commits
                          </h4>
                          <div className="divide-y divide-[#E4E4E7] dark:divide-[#27272A] border-y border-[#E4E4E7] dark:border-[#27272A]">
                            {details.commits.slice(0, 4).map((c) => (
                              <a
                                key={c.sha}
                                href={c.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between gap-4 py-2.5 text-xs hover:bg-[#FAFAFA] dark:hover:bg-[#181A20] px-2 -mx-2 rounded transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <GitCommitHorizontal className="h-3.5 w-3.5 shrink-0 text-[#71717A]" />
                                  <span className="font-mono text-[#2563EB] dark:text-[#60A5FA] shrink-0">
                                    {c.sha}
                                  </span>
                                  <span className="truncate text-[#111111] dark:text-[#E4E4E7]">
                                    {c.message}
                                  </span>
                                </div>
                                <span className="shrink-0 font-mono text-[#71717A] tabular-nums">
                                  {c.date ? new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {details?.readme && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold tracking-wide text-[#71717A] dark:text-[#A1A1AA]">
                            Repository README.md
                          </h4>
                          <div className="rounded-xl border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#0D0F13] p-5">
                            <MarkdownViewer content={details.readme} />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E4E4E7] dark:border-[#27272A]">
                <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => void loadRepoPath('')}
                    className="text-[#2563EB] dark:text-[#60A5FA] hover:underline cursor-pointer"
                  >
                    {project.githubRepo?.split('/')[1] || 'root'}
                  </button>
                  {pathSegments.map((seg, index) => {
                    const subPath = pathSegments.slice(0, index + 1).join('/');
                    return (
                      <React.Fragment key={subPath}>
                        <ChevronRight className="h-3.5 w-3.5 text-[#71717A]" />
                        <button
                          type="button"
                          onClick={() => void loadRepoPath(subPath)}
                          className="text-[#2563EB] dark:text-[#60A5FA] hover:underline cursor-pointer"
                        >
                          {seg}
                        </button>
                      </React.Fragment>
                    );
                  })}
                  {selectedFile && (
                    <>
                      <ChevronRight className="h-3.5 w-3.5 text-[#71717A]" />
                      <span className="text-[#111111] dark:text-[#F4F4F5] font-medium">
                        {selectedFile.name}
                      </span>
                    </>
                  )}
                </div>

                {selectedFile && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white cursor-pointer"
                    >
                      {copiedCode ? <Check className="h-3.5 w-3.5 text-[#2563EB]" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedCode ? 'Copied' : 'Copy file'}</span>
                    </button>
                    {selectedFile.html_url && (
                      <a
                        href={selectedFile.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] dark:text-[#60A5FA] hover:underline"
                      >
                        <span>View on GitHub</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {codeLoading ? (
                <div className="flex items-center gap-2.5 py-12 justify-center text-sm text-[#71717A]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading repository contents...</span>
                </div>
              ) : codeError ? (
                <div className="rounded-xl border border-[#E4E4E7] dark:border-[#27272A] p-6 text-sm text-[#52525B] dark:text-[#A1A1AA]">
                  <p>{codeError}</p>
                  <button
                    type="button"
                    onClick={() => void loadRepoPath(currentPath)}
                    className="mt-3 text-xs font-medium text-[#2563EB] hover:underline cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              ) : selectedFile ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-xs font-medium text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white cursor-pointer"
                  >
                    ← Back to directory listing
                  </button>
                  <div className="overflow-x-auto rounded-xl border border-[#E4E4E7] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#0D0F13]">
                    <pre className="p-4 text-xs leading-relaxed font-mono text-[#18181B] dark:text-[#E4E4E7]">
                      {selectedFile.content.split('\n').map((line, idx) => (
                        <div key={idx} className="table-row">
                          <span className="table-cell pr-4 text-right select-none text-[#A1A1AA] dark:text-[#52525B] tabular-nums">
                            {idx + 1}
                          </span>
                          <span className="table-cell whitespace-pre">{line || ' '}</span>
                        </div>
                      ))}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-[#E4E4E7] dark:divide-[#27272A] rounded-xl border border-[#E4E4E7] dark:border-[#27272A] overflow-hidden">
                  {currentPath && (
                    <button
                      type="button"
                      onClick={() => {
                        const parent = pathSegments.slice(0, -1).join('/');
                        void loadRepoPath(parent);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-mono text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#FAFAFA] dark:hover:bg-[#181A20] cursor-pointer"
                    >
                      <span>..</span>
                    </button>
                  )}
                  {dirItems.map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => void loadRepoPath(item.path)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left hover:bg-[#FAFAFA] dark:hover:bg-[#181A20] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5 min-w-0 text-sm text-[#111111] dark:text-[#F4F4F5]">
                        {item.type === 'dir' ? (
                          <Folder className="h-4 w-4 shrink-0 text-[#2563EB] dark:text-[#60A5FA]" />
                        ) : (
                          <FileCode2 className="h-4 w-4 shrink-0 text-[#71717A]" />
                        )}
                        <span className="truncate font-mono text-xs">{item.name}</span>
                      </span>
                      <span className="text-xs font-mono text-[#71717A] tabular-nums shrink-0">
                        {item.type === 'dir' ? 'Directory' : `${(item.size / 1024).toFixed(1)} KB`}
                      </span>
                    </button>
                  ))}
                  {dirItems.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-[#71717A]">
                      This directory is empty.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
