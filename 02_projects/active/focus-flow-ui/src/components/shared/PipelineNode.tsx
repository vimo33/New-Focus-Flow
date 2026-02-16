type NodeStatus = 'completed' | 'active' | 'upcoming' | 'blocked';

interface PipelineNodeProps {
  status: NodeStatus;
  label: string;
  size: 'compact' | 'full';
  className?: string;
}

export function PipelineNode({ status, label, size, className = '' }: PipelineNodeProps) {
  const isCompact = size === 'compact';
  const nodeSize = isCompact ? 'w-6 h-6' : 'w-10 h-10';
  const fontSize = isCompact ? 'text-[10px]' : 'text-xs';

  const statusStyles: Record<NodeStatus, string> = {
    completed: 'bg-primary/20 border-primary text-primary',
    active: 'bg-primary/10 border-primary text-primary animate-node-pulse',
    upcoming: 'bg-transparent border-text-tertiary/40 text-text-tertiary',
    blocked: 'bg-transparent border-secondary/60 text-secondary',
  };

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div className={`${nodeSize} rounded-full border-2 flex items-center justify-center ${statusStyles[status]}`}>
        {status === 'completed' && (
          <svg className={isCompact ? 'w-3 h-3' : 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {status === 'active' && (
          <div className={`${isCompact ? 'w-2 h-2' : 'w-3 h-3'} rounded-full bg-primary`} />
        )}
        {status === 'blocked' && (
          <svg className={isCompact ? 'w-3 h-3' : 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v-3m0-3h.01" />
          </svg>
        )}
      </div>
      {size === 'full' && (
        <span className={`${fontSize} text-center max-w-[60px] leading-tight ${
          status === 'active' ? 'text-primary font-medium' : 'text-text-secondary'
        }`}>
          {label}
        </span>
      )}
    </div>
  );
}
