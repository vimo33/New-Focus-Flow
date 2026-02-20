import { GlassCard } from './GlassCard';

interface AgentCardProps {
  name: string;
  model?: string;
  lastRun?: string;
  totalRuns: number;
  totalCost: number;
  status?: 'idle' | 'running' | 'error';
  className?: string;
}

const statusColors = {
  idle: 'bg-text-tertiary',
  running: 'bg-success animate-pulse',
  error: 'bg-danger',
};

export function AgentCard({ name, model, lastRun, totalRuns, totalCost, status = 'idle', className = '' }: AgentCardProps) {
  return (
    <GlassCard className={`${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-2.5 h-2.5 rounded-full ${statusColors[status]}`} />
        <h3 className="text-text-primary font-medium text-sm truncate">{name}</h3>
        {model && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
            {model}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-text-tertiary">Runs</p>
          <p className="text-text-primary font-mono">{totalRuns}</p>
        </div>
        <div>
          <p className="text-text-tertiary">Cost</p>
          <p className="text-text-primary font-mono">${totalCost.toFixed(2)}</p>
        </div>
      </div>
      {lastRun && (
        <p className="text-xs text-text-tertiary mt-2">
          Last: {new Date(lastRun).toLocaleDateString()}
        </p>
      )}
    </GlassCard>
  );
}
