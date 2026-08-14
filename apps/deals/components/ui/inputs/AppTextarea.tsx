'use client';

import React from 'react';
import { Input } from 'antd';
import { cn } from '../../utils/cn';
import { AppField } from './AppField';

const { TextArea } = Input;

export interface AppTextareaProps extends React.ComponentPropsWithoutRef<typeof TextArea> {
    label?: React.ReactNode;
    labelRight?: React.ReactNode;
    hint?: React.ReactNode;
    error?: React.ReactNode;
    required?: boolean;
}

export const AppTextarea = React.forwardRef<any, AppTextareaProps>(
    (
        {
            className,
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
        const defaultPlaceholder = typeof label === 'string' ? `Enter ${label.toLowerCase()}...` : undefined;
        const resolvedPlaceholder = placeholder || defaultPlaceholder;

        return (
            <AppField
                label={label}
                labelRight={labelRight}
                hint={hint}
                error={error}
                required={required}
                className={className}
            >
                <TextArea
                    ref={ref}
                    disabled={disabled}
                    placeholder={resolvedPlaceholder}
                    className={cn(
                        "w-full transition-all text-foreground",
                        "bg-neutral/50! border-border! hover:bg-neutral/80! hover:border-border!",
                        "focus:bg-neutral/80! focus:border-accent-1! focus:ring-2! focus:ring-accent-1/40!",
                        "rounded-xl! p-3.5! text-sm!",
                        "[&::placeholder]:text-foreground/30",
                        error && "border-red-500/60! focus:border-red-500! focus:ring-red-500/30!",
                        disabled && "opacity-40 pointer-events-none"
                    )}
                    {...props}
                />
            </AppField>
        );
    }
);

AppTextarea.displayName = 'AppTextarea';
