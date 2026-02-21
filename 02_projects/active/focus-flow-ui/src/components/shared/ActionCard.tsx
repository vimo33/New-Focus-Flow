interface ActionButton {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface ActionCardProps {
  children: React.ReactNode;
  accent?: 'cyan' | 'amber' | 'violet';
  actions?: ActionButton[];
  className?: string;
}

export function ActionCard({ children, accent = 'cyan', actions, className = '' }: ActionCardProps) {
  const accentColors = {
    cyan: 'border-l-primary',
    amber: 'border-l-secondary',
    violet: 'border-l-tertiary',
  };

  return (
    <div className={`bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-xl p-4 border-l-4 ${accentColors[accent]} ${className}`}>
      {children}
      {actions && actions.length > 0 && (
        <div className="flex gap-2 mt-3 justify-end">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                action.variant === 'primary'
                  ? 'bg-primary text-base hover:bg-primary/80'
                  : 'border border-[var(--glass-border)] text-text-secondary hover:text-text-primary hover:bg-elevated'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
