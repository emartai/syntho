import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-primary/20 text-primary border border-primary/30',
        accent: 'bg-accent/20 text-accent border border-accent/30',
        success: 'bg-green-500/20 text-green-400 border border-green-500/30',
        warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
        danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
        muted: 'bg-white/5 text-white/40 border border-white/10',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  }
);

export interface AuroraBadgeProps
  extends VariantProps<typeof badgeVariants> {
  className?: string;
  children: React.ReactNode;
}

export function AuroraBadge({
  variant,
  className,
  children,
}: AuroraBadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {children}
    </span>
  );
}