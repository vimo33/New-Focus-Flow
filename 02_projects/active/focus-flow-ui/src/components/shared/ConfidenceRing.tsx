interface ConfidenceRingProps {
  score: number; // 0-10
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ConfidenceRing({ score, label, size = 'md', className = '' }: ConfidenceRingProps) {
  const sizes = { sm: 48, md: 80, lg: 120 };
  const s = sizes[size];
  const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 4 : 6;
  const radius = (s - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const fontSizes = { sm: 'text-sm', md: 'text-xl', lg: 'text-3xl' };

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <svg width={s} height={s} className="-rotate-90">
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
          stroke="var(--color-tertiary)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-mono font-bold text-text-primary ${fontSizes[size]}`} style={{ fontFeatureSettings: "'tnum'" }}>
          {score.toFixed(1)}
        </span>
      </div>
      {label && (
        <span className="text-xs text-text-secondary mt-1 tracking-wider uppercase">{label}</span>
      )}
    </div>
  );
}
