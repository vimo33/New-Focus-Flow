import type { SignalStrengthScore } from '../../services/api';

interface SignalStrengthBadgeProps {
  score: SignalStrengthScore;
  compact?: boolean;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-success border-success/30 bg-success/15';
  if (score >= 40) return 'text-secondary border-secondary/30 bg-secondary/15';
  return 'text-danger border-danger/30 bg-danger/15';
}

function getTrendArrow(trend: string): string {
  if (trend === 'rising') return '\u2191';
  if (trend === 'falling') return '\u2193';
  return '\u2192';
}

function getTrendColor(trend: string): string {
  if (trend === 'rising') return 'text-success';
  if (trend === 'falling') return 'text-danger';
  return 'text-text-tertiary';
}

export function SignalStrengthBadge({ score, compact = false, className = '' }: SignalStrengthBadgeProps) {
  const numScore = Number(score.score);
  const colorClass = getScoreColor(numScore);
  const trendArrow = getTrendArrow(score.trend);
  const trendColor = getTrendColor(score.trend);

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-medium border ${colorClass} ${className}`}
        title={`Signal Strength: ${numScore}/100 (${score.trend})`}
      >
        {numScore}
        <span className={trendColor}>{trendArrow}</span>
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border ${colorClass} ${className}`}>
      <span className="font-mono font-semibold text-sm">{numScore}</span>
      <span className="text-xs opacity-70">/100</span>
      <span className={`text-sm ${trendColor}`}>{trendArrow}</span>
      {score.recommendation && (
        <span className="text-xs opacity-70 uppercase tracking-wider">
          {score.recommendation}
        </span>
      )}
    </div>
  );
}
