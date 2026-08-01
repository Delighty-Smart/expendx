import React from 'react';

/**
 * Lightweight Markdown text formatter.
 * Formats **bold**, *italic*, `code`, bullet lists, and paragraphs cleanly.
 */
export const FormattedMarkdownText: React.FC<{ content: string; className?: string }> = ({
  content,
  className = '',
}) => {
  // Process block lines first
  const lines = content.split('\n');

  return (
    <div className={`space-y-1.5 leading-relaxed ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line spacer
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Bullet points (• or - or *)
        if (/^[•\-\*]\s+/.test(trimmed)) {
          const bulletText = trimmed.replace(/^[•\-\*]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-amber-500 font-bold select-none">•</span>
              <div>{renderInlineFormatting(bulletText)}</div>
            </div>
          );
        }

        // Headers (### or ## or #)
        if (/^#{1,3}\s+/.test(trimmed)) {
          const headerText = trimmed.replace(/^#{1,3}\s+/, '');
          return (
            <div key={idx} className="font-extrabold text-base tracking-tight text-text-primary pt-1 pb-0.5">
              {renderInlineFormatting(headerText)}
            </div>
          );
        }

        // Regular line
        return <div key={idx}>{renderInlineFormatting(line)}</div>;
      })}
    </div>
  );
};

/** Parses inline **bold**, *italic*, `code` tags */
function renderInlineFormatting(text: string): React.ReactNode {
  // Regex splitting by bold (**text**), italic (*text*), and code (`text`)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-extrabold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic opacity-90">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded-md bg-white/10 dark:bg-black/20 text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
