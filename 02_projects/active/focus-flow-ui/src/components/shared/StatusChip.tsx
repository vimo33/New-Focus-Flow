const VARIANT_STYLES = {
  success: 'bg-success/15 text-success border-success/20',
  warning: 'bg-secondary/15 text-secondary border-secondary/20',
  danger: 'bg-danger/15 text-danger border-danger/20',
  info: 'bg-primary/15 text-primary border-primary/20',
  neutral: 'bg-elevated text-text-secondary border-[var(--glass-border)]',
};

const DOT_STYLES = {
  success: 'bg-success',
  warning: 'bg-secondary',
  danger: 'bg-danger',
  info: 'bg-primary',
  neutral: 'bg-text-tertiary',
};

interface StatusChipProps {
  label: string;
  variant: keyof typeof VARIANT_STYLES;
  pulse?: boolean;
}

export function StatusChip({ label, variant, pulse }: StatusChipProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold tracking-wider uppercase ${VARIANT_STYLES[variant]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOT_STYLES[variant]} ${pulse ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  );
}
