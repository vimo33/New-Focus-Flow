interface SkeletonProps {
  variant?: 'text' | 'card' | 'stat' | 'list-item' | 'avatar';
  count?: number;
  className?: string;
}

const shimmer = 'animate-pulse bg-white/[0.06] rounded';

function SkeletonItem({ variant = 'text', className = '' }: Omit<SkeletonProps, 'count'>) {
  switch (variant) {
    case 'text':
      return (
        <div className={`space-y-2.5 ${className}`}>
          <div className={`${shimmer} h-3 w-full rounded-md`} />
          <div className={`${shimmer} h-3 w-4/5 rounded-md`} />
          <div className={`${shimmer} h-3 w-3/5 rounded-md`} />
        </div>
      );
    case 'card':
      return (
        <div className={`${shimmer} rounded-xl h-32 w-full ${className}`} />
      );
    case 'stat':
      return (
        <div className={`${shimmer} rounded-lg w-24 h-16 ${className}`} />
      );
    case 'list-item':
      return (
        <div className={`${shimmer} rounded-lg h-14 w-full ${className}`} />
      );
    case 'avatar':
      return (
        <div className={`${shimmer} rounded-full w-10 h-10 ${className}`} />
      );
    default:
      return null;
  }
}

export function Skeleton({ variant = 'text', count = 1, className = '' }: SkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`} data-testid="skeleton">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonItem key={i} variant={variant} />
      ))}
    </div>
  );
}
