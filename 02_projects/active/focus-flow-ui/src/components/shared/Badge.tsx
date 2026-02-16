type BadgeVariant = 'active' | 'paused' | 'blocked' | 'completed' | 'council' | 'playbook';

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  active: 'bg-success/15 text-success border-success/30',
  paused: 'bg-text-tertiary/15 text-text-secondary border-text-tertiary/30',
  blocked: 'bg-secondary/15 text-secondary border-secondary/30',
  completed: 'bg-primary/15 text-primary border-primary/30',
  council: 'bg-tertiary/15 text-tertiary border-tertiary/30',
  playbook: 'bg-primary/10 text-primary border-primary/30',
};

export function Badge({ label, variant, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}>
      {label}
    </span>
  );
}
