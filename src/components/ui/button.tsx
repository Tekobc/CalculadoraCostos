import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm',
      secondary: 'bg-ink/5 text-ink hover:bg-ink/10',
      outline: 'border border-ink/20 text-ink hover:bg-ink/5',
      ghost: 'text-ink hover:bg-ink/5',
      accent: 'bg-accent text-ink hover:bg-amber-400 font-semibold shadow-sm',
      danger: 'bg-danger text-white hover:bg-rose-700 shadow-sm',
    };

    const sizes = {
      sm: 'min-h-[36px] px-3 py-1.5 text-xs rounded-lg gap-1.5',
      md: 'min-h-[44px] px-4 py-2.5 text-sm rounded-xl gap-2',
      lg: 'min-h-[48px] px-6 py-3 text-base rounded-xl gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
