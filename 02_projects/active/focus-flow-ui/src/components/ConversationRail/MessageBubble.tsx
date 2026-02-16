import type { ReactNode } from 'react';

interface MessageBubbleProps {
  role: 'user' | 'nitara';
  content: string;
  timestamp?: string;
  children?: ReactNode;
}

export function MessageBubble({ role, content, timestamp, children }: MessageBubbleProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[80%]">
          <div className="bg-elevated rounded-xl rounded-br-sm px-4 py-3">
            <p className="text-text-primary text-sm">{content}</p>
          </div>
          {timestamp && (
            <p className="text-text-tertiary text-[10px] mt-1 text-right">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start mb-3">
      <span className="text-primary text-lg mt-0.5 flex-shrink-0">✦</span>
      <div className="max-w-[80%]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-text-tertiary text-[10px] font-semibold tracking-wider uppercase">NITARA</span>
          {timestamp && (
            <span className="text-text-tertiary text-[10px]">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="bg-[var(--glass-bg)] rounded-xl rounded-tl-sm px-4 py-3 border-l-2 border-l-primary">
          <p className="text-text-primary text-sm">{content}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
