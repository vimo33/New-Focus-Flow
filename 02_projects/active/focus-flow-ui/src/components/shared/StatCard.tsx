import { SparkLine } from './SparkLine';

interface StatCardProps {
  value: string;
  label: string;
  trend?: { direction: 'up' | 'down' | 'flat'; percentage: string };
  sparkData?: number[];
  currency?: string;
  className?: string;
}

export function StatCard({ value, label, trend, sparkData, currency, className = '' }: StatCardProps) {
  const trendColors = {
    up: 'text-success',
    down: 'text-danger',
    flat: 'text-text-secondary',
  };
  const trendArrows = { up: '\u2191', down: '\u2193', flat: '\u2192' };

  return (
    <div className={`bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-xl p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-2xl font-bold text-text-primary tabular-nums" style={{ fontFeatureSettings: "'tnum'" }}>
            {currency && <span className="text-text-secondary text-lg mr-1">{currency}</span>}
            {value}
          </p>
          <p className="text-text-secondary text-sm mt-1">{label}</p>
        </div>
        {sparkData && sparkData.length > 0 && (
          <SparkLine data={sparkData} width={60} height={24} />
        )}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-sm ${trendColors[trend.direction]}`}>
          <span>{trendArrows[trend.direction]}</span>
          <span>{trend.percentage}</span>
        </div>
      )}
    </div>
  );
}
