interface ConfidenceRingProps {
  score: number; // 0-10
  label?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function ConfidenceRing({ score, label, size = 'md', className = '' }: ConfidenceRingProps) {
  const sizes = { sm: 48, md: 80, lg: 120, xl: 200 };
  const s = sizes[size];
  const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 4 : size === 'lg' ? 6 : 10;
  const radius = (s - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const fontSizes = { sm: 'text-sm', md: 'text-xl', lg: 'text-3xl', xl: 'text-5xl' };
  const gradientId = `ring-gradient-${size}-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <svg width={s} height={s} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-success)" />
            <stop offset="50%" stopColor="var(--color-secondary)" />
            <stop offset="100%" stopColor="var(--color-danger)" />
          </linearGradient>
        </defs>
        <circle
          cx={s / 2}
          cy={s / 2}
          r={radius}
          fill="none"
          stroke="var(--glass-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={s / 2}
          cy={s / 2}
          r={radius}
          fill="none"
          stroke={size === 'xl' ? `url(#${gradientId})` : 'var(--color-tertiary)'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {size === 'xl' && (
          <span className="text-[10px] tracking-[0.2em] text-text-tertiary uppercase mb-1">COMPOSITE</span>
        )}
        <span className={`font-mono font-bold text-text-primary ${fontSizes[size]}`} style={{ fontFeatureSettings: "'tnum'", letterSpacing: '0.05em' }}>
          {score.toFixed(1)}
        </span>
      </div>
      {label && (
        <span className="text-xs text-text-secondary mt-1 tracking-wider uppercase">{label}</span>
      )}
    </div>
  );
}
