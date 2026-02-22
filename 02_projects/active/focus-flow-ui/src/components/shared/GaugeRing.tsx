const SIZE_MAP = {
  sm: { size: 48, stroke: 4, fontSize: 'text-sm', subSize: 'text-[9px]' },
  md: { size: 64, stroke: 5, fontSize: 'text-lg', subSize: 'text-[10px]' },
  lg: { size: 96, stroke: 6, fontSize: 'text-2xl', subSize: 'text-xs' },
};

const COLOR_MAP = {
  primary: { track: 'rgba(0,229,255,0.15)', fill: '#00E5FF' },
  success: { track: 'rgba(34,197,94,0.15)', fill: '#22C55E' },
  danger: { track: 'rgba(239,68,68,0.15)', fill: '#EF4444' },
  gradient: { track: 'rgba(0,229,255,0.15)', fill: 'url(#gauge-gradient)' },
};

interface GaugeRingProps {
  value: number;
  max?: number;
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: keyof typeof COLOR_MAP;
}

export function GaugeRing({ value, max = 100, label, sublabel, size = 'md', color = 'primary' }: GaugeRingProps) {
  const { size: s, stroke, fontSize, subSize } = SIZE_MAP[size];
  const { track, fill } = COLOR_MAP[color];
  const radius = (s - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);

  return (
    <div className="inline-flex flex-col items-center">
      <div className="relative" style={{ width: s, height: s }}>
        <svg width={s} height={s} className="-rotate-90">
          {color === 'gradient' && (
            <defs>
              <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00E5FF" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          )}
          <circle
            cx={s / 2}
            cy={s / 2}
            r={radius}
            fill="none"
            stroke={track}
            strokeWidth={stroke}
          />
          <circle
            cx={s / 2}
            cy={s / 2}
            r={radius}
            fill="none"
            stroke={fill}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono font-bold text-text-primary ${fontSize}`}>
            {Math.round(value)}
          </span>
        </div>
      </div>
      {label && <span className={`text-text-secondary ${subSize} mt-1`}>{label}</span>}
      {sublabel && <span className={`text-text-tertiary ${subSize}`}>{sublabel}</span>}
    </div>
  );
}
