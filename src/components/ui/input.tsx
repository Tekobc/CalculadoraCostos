import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={twMerge(
          clsx(
            'flex w-full min-h-[44px] rounded-xl border bg-white/80 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-danger focus-visible:ring-danger' : 'border-ink/15 hover:border-ink/30',
            className
          )
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
