import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, ...props }, ref) => {
        return (
            <div className="w-full">
                <input
                    type={type}
                    className={cn(
                        'flex h-10 w-full rounded-btn border border-border-2 bg-surface px-3 py-2 text-sm font-body text-text',
                        'placeholder:text-text-3',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        'transition-colors',
                        error && 'border-danger focus-visible:ring-danger',
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {error && (
                    <p className="mt-1 text-xs text-danger">{error}</p>
                )}
            </div>
        );
    }
);
Input.displayName = 'Input';

export { Input };
