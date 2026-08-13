'use client';

import React from 'react';
import { TimePicker, TimePickerProps } from 'antd';
import { cn } from '../../utils/cn';
import { AppField } from '../inputs/AppField';
import { Clock } from 'lucide-react';

export interface AppTimePickerProps extends Omit<TimePickerProps, 'size'> {
    label?: React.ReactNode;
    labelRight?: React.ReactNode;
    hint?: React.ReactNode;
    error?: React.ReactNode;
    required?: boolean;
    size?: 'sm' | 'md' | 'lg';
    shape?: 'default' | 'pill';
}

export const AppTimePicker = React.forwardRef<any, AppTimePickerProps>(
    (
        {
            className,
            label,
            labelRight,
            hint,
            error,
            required = false,
            placeholder,
            size = 'md',
            shape = 'default',
            disabled,
            ...props
        },
        ref
    ) => {
        const defaultPlaceholder = typeof label === 'string' ? `Select ${label.toLowerCase()}...` : 'Select time...';
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
                <TimePicker
                    ref={ref}
                    disabled={disabled}
                    placeholder={resolvedPlaceholder}
                    suffixIcon={<Clock size={15} className="text-text shrink-0" />}
                    size={size === 'sm' ? 'small' : size === 'lg' ? 'large' : 'middle'}
                    className={cn(
                        "w-full sm:w-40 transition-all text-foreground overflow-hidden",
                        size === 'sm' && "h-8 text-xs [&_.ant-picker-input_input]:text-xs [&_.ant-picker-input_input]:!py-1",
                        size === 'md' && "h-10 text-sm [&_.ant-picker-input_input]:text-sm [&_.ant-picker-input_input]:!py-2",
                        size === 'lg' && "h-12 text-base [&_.ant-picker-input_input]:text-base [&_.ant-picker-input_input]:!py-3",
                        shape === 'pill' ? "rounded-full!" : "rounded-xl!",
                        "bg-neutral/50! border-border! hover:bg-neutral/80! hover:border-border!",
                        "focus-within:bg-neutral/80! focus-within:border-accent-1! focus-within:ring-2! focus-within:ring-accent-1/40!",
                        "px-3.5!",
                        "[&_.ant-picker-input_input::placeholder]:text-foreground/30",
                        error && "border-red-500/60! focus-within:border-red-500! focus-within:ring-red-500/30!",
                        disabled && "opacity-40 pointer-events-none"
                    )}
                    {...props}
                />
            </AppField>
        );
    }
);

AppTimePicker.displayName = 'AppTimePicker';
