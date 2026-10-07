import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={twMerge(
          clsx(
            'flex w-full min-h-[110px] rounded-xl border bg-white/80 p-3.5 text-sm text-ink placeholder:text-ink/40 transition-colors resize-y',
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

Textarea.displayName = 'Textarea';
