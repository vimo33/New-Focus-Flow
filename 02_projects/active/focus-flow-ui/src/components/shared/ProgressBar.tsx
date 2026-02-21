interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}

export function ProgressBar({ value, max, label, showValue = true, className = '' }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warning' : 'bg-success';

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-sm text-text-secondary">{label}</span>}
          {showValue && (
            <span className="text-sm font-mono text-text-primary">
              ${value.toFixed(2)} / ${max.toFixed(2)}
            </span>
          )}
        </div>
      )}
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showValue && (
        <p className="text-xs text-text-tertiary mt-0.5 text-right">{pct}%</p>
      )}
    </div>
  );
}
