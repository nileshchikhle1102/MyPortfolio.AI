import React, { useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import {
  CREDENTIALS,
  EXPERIENCES,
  FEATURED_PROJECTS,
  PROFILE,
  SKILL_GROUPS,
} from '../data/portfolioData';

interface ResumeModalProps {
  open: boolean;
  onClose: () => void;
}

export const ResumeModal: React.FC<ResumeModalProps> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 md:p-8 print:static print:inset-auto print:block print:bg-white print:backdrop-blur-none print:p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#111318] print:block print:max-w-none print:max-h-none print:overflow-visible print:rounded-none print:border-0 print:bg-white">
        {/* Modal Toolbar — hidden when printing */}
        <div className="flex items-center justify-between gap-4 border-b border-[#E4E4E7] dark:border-[#27272A] px-6 py-4 print:hidden">
          <h3 id="resume-modal-title" className="text-base font-semibold text-[#111111] dark:text-white">
            Curriculum Vitae — {PROFILE.name}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close resume preview"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#27272A] text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scroll Container — unwrapped cleanly for print */}
        <div className="overflow-y-auto p-6 md:p-10 bg-[#F4F4F5] dark:bg-[#0B0C0F] print:overflow-visible print:p-0 print:bg-white">
          <article
            id="resume-print-sheet"
            className="mx-auto max-w-[780px] rounded-xl border border-[#E4E4E7] bg-white text-[#111111] p-8 md:p-10 space-y-5 print:space-y-3 print:max-w-none print:border-0 print:rounded-none print:p-0"
          >
            <header className="border-b border-[#E4E4E7] pb-4 print:pb-2.5">
              <h1 className="text-2xl print:text-xl font-bold tracking-tight text-[#111111]">
                {PROFILE.name}
              </h1>
              <p className="mt-0.5 text-sm print:text-xs font-medium text-[#2563EB]">
                {PROFILE.role}
              </p>
              <p className="mt-1.5 text-xs print:text-[10.5px] text-[#52525B] flex flex-wrap gap-x-2 gap-y-0.5">
                <span>Nagpur, Maharashtra</span>
                <span aria-hidden="true">·</span>
                <span>{PROFILE.phone}</span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-[#111111]">Immediate Joiner</span>
              </p>
              <p className="mt-0.5 text-xs print:text-[10.5px] text-[#52525B] flex flex-wrap gap-x-2 gap-y-0.5">
                <span>{PROFILE.email}</span>
                <span aria-hidden="true">·</span>
                <span>{PROFILE.secondaryEmail}</span>
                <span aria-hidden="true">·</span>
                <span>linkedin.com/in/nileshchikhle</span>
                <span aria-hidden="true">·</span>
                <span>github.com/nileshchikhle1102</span>
              </p>
            </header>

            <section className="space-y-1.5 print:space-y-1">
              <h2 className="text-xs print:text-[11px] font-semibold tracking-wider text-[#52525B] border-b border-[#E4E4E7] pb-1">
                Summary
              </h2>
              <p className="text-xs print:text-[10.5px] leading-relaxed print:leading-snug text-[#27272A]">
                {PROFILE.bio}
              </p>
            </section>

            <section className="space-y-1.5 print:space-y-1">
              <h2 className="text-xs print:text-[11px] font-semibold tracking-wider text-[#52525B] border-b border-[#E4E4E7] pb-1">
                Technical Skills
              </h2>
              <div className="space-y-1 print:space-y-0.5 text-xs print:text-[10.5px] text-[#3F3F46]">
                {SKILL_GROUPS.map((group) => (
                  <p key={group.category} className="leading-snug">
                    <strong className="font-semibold text-[#111111]">{group.category}:</strong>{' '}
                    {group.items.join(', ')}
                  </p>
                ))}
              </div>
            </section>

            <section className="space-y-3 print:space-y-2">
              <h2 className="text-xs print:text-[11px] font-semibold tracking-wider text-[#52525B] border-b border-[#E4E4E7] pb-1">
                Professional Experience
              </h2>
              {EXPERIENCES.map((exp) => (
                <div key={exp.id} className="space-y-1 break-inside-avoid">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm print:text-xs font-semibold text-[#111111]">
                      {exp.role} — {exp.company}
                    </h3>
                    <span className="text-xs print:text-[10.5px] font-mono text-[#52525B] tabular-nums">
                      {exp.period} · {exp.location}
                    </span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 print:space-y-0.5 text-xs print:text-[10.5px] leading-relaxed print:leading-snug text-[#3F3F46]">
                    {exp.highlights.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            <section className="space-y-2 print:space-y-1.5 break-inside-avoid">
              <h2 className="text-xs print:text-[11px] font-semibold tracking-wider text-[#52525B] border-b border-[#E4E4E7] pb-1">
                Key Projects
              </h2>
              {FEATURED_PROJECTS.filter((p) => p.id !== 'crm-modernization').slice(0, 3).map((proj) => (
                <div key={proj.id} className="space-y-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm print:text-xs font-semibold text-[#111111]">{proj.title}</h3>
                    <span className="text-xs print:text-[10px] font-mono text-[#52525B]">
                      {proj.stack.slice(0, 4).join(' · ')}
                    </span>
                  </div>
                  <p className="text-xs print:text-[10.5px] leading-snug text-[#3F3F46]">
                    {proj.description}
                  </p>
                </div>
              ))}
            </section>

            <section className="space-y-1.5 print:space-y-1 break-inside-avoid">
              <h2 className="text-xs print:text-[11px] font-semibold tracking-wider text-[#52525B] border-b border-[#E4E4E7] pb-1">
                Education &amp; Certifications
              </h2>
              <ul className="list-disc pl-4 space-y-1 print:space-y-0.5 text-xs print:text-[10.5px] text-[#3F3F46]">
                {CREDENTIALS.map((cred) => (
                  <li key={cred.id}>
                    <strong className="font-semibold text-[#111111]">{cred.title}</strong> — {cred.issuer} ({cred.period})
                  </li>
                ))}
              </ul>
            </section>
          </article>
        </div>
      </div>
    </div>
  );
};
