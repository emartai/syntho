import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded-badge px-2.5 py-0.5 text-[11px] font-semibold font-body transition-colors',
    {
        variants: {
            variant: {
                default:
                    'bg-primary-dim text-primary border border-primary-glow',
                accent:
                    'bg-accent-dim text-accent border border-accent-glow',
                success:
                    'bg-success-dim text-success border border-[rgba(34,197,94,0.25)]',
                warning:
                    'bg-warning-dim text-warning border border-[rgba(245,158,11,0.25)]',
                danger:
                    'bg-danger-dim text-danger border border-[rgba(239,68,68,0.25)]',
                muted:
                    'bg-[rgba(241,240,255,0.06)] text-text-3 border border-[rgba(241,240,255,0.1)]',
                outline:
                    'border border-border-2 text-text-2 bg-transparent',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
