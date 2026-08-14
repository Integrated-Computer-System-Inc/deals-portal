'use client';

import React from 'react';
import { DatePicker } from 'antd';
import { cn } from '../../utils/cn';
import { AppField } from '../inputs/AppField';
import { Calendar } from 'lucide-react';

const { RangePicker } = DatePicker;

type AntRangePickerProps = React.ComponentProps<typeof RangePicker>;

export interface AppDateRangePickerProps extends Omit<AntRangePickerProps, 'size'> {
    label?: React.ReactNode;
    labelRight?: React.ReactNode;
    hint?: React.ReactNode;
    error?: React.ReactNode;
    required?: boolean;
    size?: 'sm' | 'md' | 'lg';
    shape?: 'default' | 'pill';
}

export const AppDateRangePicker = React.forwardRef<any, AppDateRangePickerProps>(
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
        const resolvedPlaceholder = placeholder || ['Start date', 'End date'];

        return (
            <AppField
                label={label}
                labelRight={labelRight}
                hint={hint}
                error={error}
                required={required}
                className={className}
            >
                <RangePicker
                    ref={ref}
                    disabled={disabled}
                    placeholder={resolvedPlaceholder}
                    suffixIcon={<Calendar size={15} className="text-text shrink-0" />}
                    size={size === 'sm' ? 'small' : size === 'lg' ? 'large' : 'middle'}
                    className={cn(
                        "w-full sm:w-72 transition-all text-foreground overflow-hidden",
                        size === 'sm' && "h-8 text-xs [&_.ant-picker-input_input]:text-xs [&_.ant-picker-input_input]:!py-1",
                        size === 'md' && "h-10 text-sm [&_.ant-picker-input_input]:text-sm [&_.ant-picker-input_input]:!py-2",
                        size === 'lg' && "h-12 text-base [&_.ant-picker-input_input]:text-base [&_.ant-picker-input_input]:!py-3",
                        shape === 'pill' ? "rounded-full!" : "rounded-xl!",
                        "bg-neutral/50! border-border! hover:bg-neutral/80! hover:border-border!",
                        "focus-within:bg-neutral/80! focus-within:border-accent-1! focus-within:ring-2! focus-within:ring-accent-1/40!",
                        "px-3.5!",
                        "[&_.ant-picker-input_input::placeholder]:text-foreground/30",
                        "[&_.ant-picker-active-bar]:bg-accent-1!",
                        "[&_.ant-picker-separator]:text-foreground/40",
                        error && "border-red-500/60! focus-within:border-red-500! focus-within:ring-red-500/30!",
                        disabled && "opacity-40 pointer-events-none"
                    )}
                    {...props}
                />
            </AppField>
        );
    }
);

AppDateRangePicker.displayName = 'AppDateRangePicker';
