interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated';
}

export function GlassCard({ children, className = '', variant = 'default' }: GlassCardProps) {
  const bg = variant === 'elevated'
    ? 'bg-elevated/70'
    : 'bg-[var(--glass-bg)]';

  return (
    <div className={`${bg} backdrop-blur-xl border border-[var(--glass-border)] rounded-xl p-6 ${className}`}>
      {children}
    </div>
  );
}
