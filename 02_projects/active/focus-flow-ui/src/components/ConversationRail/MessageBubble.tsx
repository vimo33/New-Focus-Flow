import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';
import type { MessageAttachment } from '../../stores/conversation';

interface MessageBubbleProps {
  role: 'user' | 'nitara';
  content: string;
  timestamp?: string;
  children?: ReactNode;
  attachments?: MessageAttachment[];
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function AttachmentChips({ attachments }: { attachments: MessageAttachment[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {attachments.map((att, i) => (
        <a
          key={i}
          href={att.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-elevated/60 border border-[var(--glass-border)] text-xs text-text-secondary hover:text-primary hover:border-primary/40 transition-colors"
        >
          <FileText size={12} className="flex-shrink-0" />
          <span className="truncate max-w-[120px]">{att.filename}</span>
          <span className="text-text-tertiary flex-shrink-0">{formatSize(att.size)}</span>
        </a>
      ))}
    </div>
  );
}

export function MessageBubble({ role, content, timestamp, children, attachments }: MessageBubbleProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[80%]">
          <div className="bg-elevated rounded-xl rounded-br-sm px-4 py-3">
            <p className="text-text-primary text-sm">{content}</p>
            {attachments && attachments.length > 0 && <AttachmentChips attachments={attachments} />}
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
          {attachments && attachments.length > 0 && <AttachmentChips attachments={attachments} />}
        </div>
        {children}
      </div>
    </div>
  );
}
