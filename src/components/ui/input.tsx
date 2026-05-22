import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-9 w-full rounded-lg border border-border-1 bg-surface-1 px-3 py-1 text-sm text-text-1 transition-colors placeholder:text-text-3 focus-visible:outline-none focus-visible:border-brand-from focus-visible:ring-2 focus-visible:ring-brand-from/30 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-lg border border-border-1 bg-surface-1 px-3 py-2 text-sm text-text-1 placeholder:text-text-3 focus-visible:outline-none focus-visible:border-brand-from focus-visible:ring-2 focus-visible:ring-brand-from/30 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
