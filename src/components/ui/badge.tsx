import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'support' | 'outline' | 'danger';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const base =
    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium select-none transition-colors';

  const variants = {
    default: 'bg-ink/10 text-ink',
    accent: 'bg-accent/20 text-ink border border-accent/40 font-semibold',
    support: 'bg-support/20 text-ink border border-support/30',
    outline: 'border border-ink/20 text-ink/80',
    danger: 'bg-danger/15 text-danger font-semibold',
  };

  return (
    <span className={twMerge(clsx(base, variants[variant], className))} {...props}>
      {children}
    </span>
  );
}
