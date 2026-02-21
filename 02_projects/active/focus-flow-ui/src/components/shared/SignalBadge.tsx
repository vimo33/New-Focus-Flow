interface SignalBadgeProps {
  type: string;
  source?: string;
  className?: string;
}

const typeColors: Record<string, string> = {
  metric: 'bg-primary/15 text-primary border-primary/30',
  event: 'bg-tertiary/15 text-tertiary border-tertiary/30',
  feedback: 'bg-success/15 text-success border-success/30',
  alert: 'bg-danger/15 text-danger border-danger/30',
};

export function SignalBadge({ type, source, className = '' }: SignalBadgeProps) {
  const style = typeColors[type] || 'bg-text-tertiary/15 text-text-secondary border-text-tertiary/30';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${style} ${className}`}>
      {type}
      {source && <span className="text-text-tertiary">({source})</span>}
    </span>
  );
}
