import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center whitespace-nowrap rounded-btn text-sm font-semibold font-body ring-offset-bg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                default:
                    'btn-gradient text-white shadow-glow hover:shadow-[0_0_32px_rgba(167,139,250,0.35)]',
                destructive:
                    'bg-danger text-white hover:bg-danger/90',
                outline:
                    'border border-border-2 bg-transparent text-text-2 hover:bg-surface-2 hover:text-text hover:border-border-3',
                secondary:
                    'bg-surface-2 text-text-2 border border-border hover:bg-surface-3 hover:text-text',
                ghost:
                    'text-text-2 hover:bg-surface hover:text-text',
                link:
                    'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-10 px-5 py-2',
                sm: 'h-8 px-3.5 text-xs',
                lg: 'h-12 px-8 text-base',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
