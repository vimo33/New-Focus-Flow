import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`prose prose-invert prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-text-primary mt-6 mb-3">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-text-primary mt-5 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-text-secondary mt-4 mb-2">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-text-secondary text-sm leading-relaxed mb-3">{children}</p>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline underline-offset-2">
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-text-secondary text-sm space-y-1 mb-3">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-text-secondary text-sm space-y-1 mb-3">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-text-secondary text-sm">{children}</li>
          ),
          code: ({ children, className: codeClassName }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return (
                <code className="bg-elevated/50 text-primary px-1.5 py-0.5 rounded text-xs font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className="block bg-elevated/30 border border-[var(--glass-border)] rounded-lg p-4 text-xs font-mono text-text-secondary overflow-x-auto">
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/40 pl-4 italic text-text-tertiary text-sm mb-3">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-text-primary">{children}</strong>
          ),
          hr: () => <hr className="border-[var(--glass-border)] my-4" />,
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-sm text-text-secondary border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-[var(--glass-border)]">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="text-left text-text-primary text-xs font-semibold uppercase tracking-wider px-3 py-2">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-[var(--glass-border)]/30 text-sm">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
