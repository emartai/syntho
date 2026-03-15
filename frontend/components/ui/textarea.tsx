import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-lg border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-text placeholder:text-[rgba(241,240,255,0.38)] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-danger focus:ring-danger',
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
Textarea.displayName = 'Textarea';

export { Textarea };