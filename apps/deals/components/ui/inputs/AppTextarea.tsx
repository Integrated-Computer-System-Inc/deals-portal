'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { AppField } from './AppField';

export interface AppTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  labelRight?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  containerClassName?: string;
}

export const AppTextarea = React.forwardRef<HTMLTextAreaElement, AppTextareaProps>(
  (
    {
      className,
      containerClassName,
      label,
      labelRight,
      hint,
      error,
      required = false,
      placeholder,
      disabled,
      ...props
    },
    ref
  ) => {
    const defaultPlaceholder =
      typeof label === 'string' ? `Enter ${label.toLowerCase()}...` : undefined;
    const resolvedPlaceholder = placeholder || defaultPlaceholder;

    return (
      <AppField
        label={label}
        labelRight={labelRight}
        hint={hint}
        error={error}
        required={required}
        className={containerClassName}
      >
        <textarea
          ref={ref}
          disabled={disabled}
          placeholder={resolvedPlaceholder}
          className={cn(
            'w-full transition-all text-foreground bg-neutral/50 border border-border rounded-xl p-3.5 text-sm outline-none resize-y',
            'hover:bg-neutral/80 hover:border-border',
            'focus:bg-neutral/80 focus:border-primary focus:ring-2 focus:ring-primary/30',
            'placeholder:text-foreground/40',
            error &&
              '!border-rose-500 focus:!border-rose-500 !ring-2 !ring-rose-500/30 !bg-rose-500/5',
            disabled && 'opacity-50 pointer-events-none cursor-not-allowed',
            className
          )}
          {...props}
        />
      </AppField>
    );
  }
);

AppTextarea.displayName = 'AppTextarea';
