import { useEffect, useCallback } from 'react';

const WIDTH_MAP = {
  sm: 'w-80',      // 320px
  md: 'w-[400px]',
  lg: 'w-[480px]',
};

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg';
  position?: 'right' | 'left';
}

export function Drawer({ open, onClose, title, children, width = 'md', position = 'right' }: DrawerProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  const slideClass = position === 'right'
    ? 'right-0 animate-slide-in-right'
    : 'left-0 animate-slide-in-left';

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-base/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`absolute top-0 bottom-0 ${slideClass} ${WIDTH_MAP[width]} max-w-[calc(100vw-2rem)] bg-surface border-l border-[var(--glass-border)] shadow-2xl flex flex-col`}
        style={{ animation: `slide-in-${position} 200ms ease-out` }}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--glass-border)]">
            <h3 className="text-text-primary text-sm font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-elevated transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slide-in-left {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
