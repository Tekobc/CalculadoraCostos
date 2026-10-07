import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={twMerge(
          clsx(
            'block text-sm font-medium text-ink/90 mb-1.5 select-none',
            className
          )
        )}
        {...props}
      >
        {children}
        {required && <span className="text-danger ml-1" aria-hidden="true">*</span>}
      </label>
    );
  }
);

Label.displayName = 'Label';
