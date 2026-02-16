interface ActionButton {
  label: string;
  onClick?: () => void;
  variant: 'primary' | 'secondary';
}

interface ConversationActionCardProps {
  title: string;
  description?: string;
  accent?: 'cyan' | 'amber' | 'violet';
  actions: ActionButton[];
}

export function ConversationActionCard({ title, description, accent = 'cyan', actions }: ConversationActionCardProps) {
  const accentColors = {
    cyan: 'border-l-primary',
    amber: 'border-l-secondary',
    violet: 'border-l-tertiary',
  };

  return (
    <div className={`mt-2 bg-elevated/50 border border-[var(--glass-border)] rounded-lg p-3 border-l-4 ${accentColors[accent]}`}>
      <p className="text-text-primary text-sm font-medium">{title}</p>
      {description && <p className="text-text-secondary text-xs mt-1">{description}</p>}
      <div className="flex gap-2 mt-2">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              action.variant === 'primary'
                ? 'bg-primary text-base hover:bg-primary/80'
                : 'border border-[var(--glass-border)] text-text-secondary hover:text-text-primary'
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
