interface NitaraInsightCardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function NitaraInsightCard({ children, title = 'NITARA NOTE', className = '' }: NitaraInsightCardProps) {
  return (
    <div className={`bg-secondary/10 border border-secondary/20 rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-secondary text-sm">{'\u2726'}</span>
        <span className="text-secondary text-xs font-semibold tracking-wider uppercase">{title}</span>
      </div>
      <div className="text-text-secondary text-sm">
        {children}
      </div>
    </div>
  );
}
