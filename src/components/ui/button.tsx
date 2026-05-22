'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-from/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-br from-brand-from to-brand-to text-white shadow-glow-sm hover:shadow-glow-md active:scale-[0.98]',
        outline:
          'border border-border-1 bg-surface-1 text-text-1 hover:bg-surface-2 hover:border-border-strong',
        ghost: 'text-text-2 hover:bg-surface-2 hover:text-text-1',
        subtle:
          'bg-surface-2 text-text-1 hover:bg-surface-3 border border-border-1',
        danger:
          'bg-red-500 text-white hover:bg-red-600 shadow-[0_0_0_1px_rgba(239,68,68,0.4),0_4px_16px_-4px_rgba(239,68,68,0.4)]',
        chip: 'bg-brand-from/10 text-brand-from hover:bg-brand-from/20 border border-brand-from/20',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
