import type { PruningRecommendation } from '../../services/api';

interface PruningRecommendationsProps {
  recommendations: PruningRecommendation[];
  onAction?: (projectId: string, action: 'kill' | 'keep') => void;
  className?: string;
}

function getRecColor(rec: string): string {
  switch (rec) {
    case 'kill': return 'border-danger/40 bg-danger/10';
    case 'park': return 'border-secondary/40 bg-secondary/10';
    case 'scale': return 'border-success/40 bg-success/10';
    default: return 'border-border bg-surface';
  }
}

function getRecLabel(rec: string): string {
  switch (rec) {
    case 'kill': return 'KILL';
    case 'park': return 'PARK';
    case 'scale': return 'SCALE';
    case 'double_down': return 'DOUBLE DOWN';
    case 'iterate': return 'ITERATE';
    default: return rec.toUpperCase();
  }
}

function getRecTextColor(rec: string): string {
  switch (rec) {
    case 'kill': return 'text-danger';
    case 'park': return 'text-secondary';
    case 'scale': return 'text-success';
    default: return 'text-text-primary';
  }
}

export function PruningRecommendations({ recommendations, onAction, className = '' }: PruningRecommendationsProps) {
  if (recommendations.length === 0) return null;

  const kills = recommendations.filter(r => r.recommendation === 'kill');
  const parks = recommendations.filter(r => r.recommendation === 'park');
  const scales = recommendations.filter(r => r.recommendation === 'scale');

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-wider text-text-tertiary font-medium">
          Pruning Recommendations
        </h3>
        <span className="text-xs text-text-tertiary font-mono">
          {kills.length} kill / {parks.length} park / {scales.length} scale
        </span>
      </div>

      <div className="grid gap-2">
        {recommendations.map(rec => (
          <div
            key={rec.project_id}
            className={`rounded-lg border p-3 ${getRecColor(rec.recommendation)}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-text-primary">
                {rec.project_name}
              </span>
              <span className={`text-xs font-mono font-bold ${getRecTextColor(rec.recommendation)}`}>
                {getRecLabel(rec.recommendation)}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-1.5">
              <span className="text-xs font-mono text-text-secondary">
                Score: {rec.score}/100
              </span>
              <span className="text-xs text-text-tertiary">
                {rec.trend} for {rec.days_at_level}d
              </span>
            </div>
            <p className="text-xs text-text-tertiary">{rec.rationale}</p>
            {onAction && (rec.recommendation === 'kill' || rec.recommendation === 'park') && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => onAction(rec.project_id, 'kill')}
                  className="px-2 py-1 text-xs rounded bg-danger/20 text-danger hover:bg-danger/30 transition-colors cursor-pointer"
                >
                  Confirm Kill
                </button>
                <button
                  onClick={() => onAction(rec.project_id, 'keep')}
                  className="px-2 py-1 text-xs rounded bg-surface text-text-secondary hover:bg-elevated transition-colors cursor-pointer"
                >
                  Keep Active
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
