import React from 'react';

interface MarkdownViewerProps {
  content: string;
}

function renderInline(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push(
        <strong key={key++} className="font-semibold text-[#111111] dark:text-[#F4F4F5]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push(
        <code
          key={key++}
          className="font-mono text-[0.85em] px-1.5 py-0.5 rounded bg-[#F4F4F5] dark:bg-[#1C1E26] text-[#111111] dark:text-[#E4E4E7]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        const href = linkMatch[2];
        const safeHref = href.startsWith('http://') || href.startsWith('https://') ? href : '#';
        tokens.push(
          <a
            key={key++}
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563EB] dark:text-[#60A5FA] underline underline-offset-4 hover:opacity-80"
          >
            {linkMatch[1]}
          </a>
        );
      }
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip raw HTML badge blocks commonly used in GitHub READMEs
    if (line.trim().startsWith('<div') || line.trim().startsWith('<img') || line.trim().startsWith('</div') || line.trim().startsWith('<p><img')) {
      i++;
      continue;
    }

    // Code block
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(
        <pre
          key={blocks.length}
          className="overflow-x-auto rounded-lg border border-[#E4E4E7] dark:border-[#27272A] bg-[#F4F4F5] dark:bg-[#14161B] p-4 text-xs leading-relaxed font-mono text-[#18181B] dark:text-[#E4E4E7]"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push(<hr key={blocks.length} className="border-[#E4E4E7] dark:border-[#27272A]" />);
      i++;
      continue;
    }

    // Headings
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].replace(/<[^>]+>/g, '');
      const cls =
        level === 1
          ? 'text-xl font-semibold tracking-tight text-[#111111] dark:text-[#F4F4F5] pt-2'
          : level === 2
            ? 'text-base font-semibold tracking-tight text-[#111111] dark:text-[#F4F4F5] pt-3'
            : 'text-sm font-semibold text-[#111111] dark:text-[#F4F4F5] pt-2';
      blocks.push(
        <h4 key={blocks.length} className={cls}>
          {renderInline(text)}
        </h4>
      );
      i++;
      continue;
    }

    // Bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={blocks.length} className="space-y-1.5 pl-4 list-disc text-sm text-[#3F3F46] dark:text-[#D4D4D8]">
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph
    const cleanText = line.replace(/<[^>]+>/g, '').trim();
    if (cleanText) {
      blocks.push(
        <p key={blocks.length} className="text-sm leading-relaxed text-[#3F3F46] dark:text-[#D4D4D8]">
          {renderInline(cleanText)}
        </p>
      );
    }
    i++;
  }

  return <div className="space-y-3">{blocks}</div>;
};
