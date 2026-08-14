'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';
import { AppLabel } from '../labels';

export interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'neutral' | 'ghost' | 'link' | 'accent';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    shape?: 'default' | 'pill';
    loading?: boolean;
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const AppButton = React.forwardRef<HTMLButtonElement, AppButtonProps>(
    (
        {
            className,
            type = 'button',
            variant = 'primary',
            size = 'md',
            shape = 'default',
            loading = false,
            fullWidth = false,
            leftIcon,
            rightIcon,
            children,
            disabled,
            ...props
        },
        ref
    ) => {
        const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer';

        const variants = {
            primary: 'bg-accent-1 text-white border border-transparent hover:bg-accent-1/80 hover:shadow-md focus-visible:ring-accent-1/50 shadow-sm',
            accent: 'bg-accent-1 text-white border border-transparent hover:bg-accent-1/80 hover:shadow-md focus-visible:ring-accent-1/50 shadow-sm',
            secondary: 'bg-accent-2 text-white border border-transparent hover:bg-accent-2/80 hover:shadow-md focus-visible:ring-accent-2/50 shadow-sm',
            danger: 'bg-red-600 text-white border border-transparent hover:bg-red-600/80 dark:bg-red-700 dark:hover:bg-red-700/80 hover:shadow-md focus-visible:ring-red-500/50 shadow-sm',
            link: 'text-accent-1 hover:underline underline-offset-4 bg-transparent p-0 h-auto w-auto focus-visible:ring-0 focus-visible:ring-offset-0 disabled:text-muted-foreground hover:bg-transparent active:scale-100 cursor-pointer',
            neutral: 'border border-border bg-neutral/40 hover:bg-accent-1 hover:text-white hover:border-accent-1 text-foreground hover:shadow-sm focus-visible:ring-border/50',
            ghost: 'border border-transparent bg-transparent hover:bg-neutral dark:hover:bg-white/8 text-foreground hover:shadow-none focus-visible:ring-border/50'
        };

        const sizes = {
            sm: 'h-8 px-3 text-xs gap-1.5',
            md: 'h-10 px-4 text-sm gap-2',
            lg: 'h-11 px-8 text-sm gap-2',
            icon: 'h-9 w-9 p-0 flex items-center justify-center gap-0'
        };

        const sizeClasses = variant === 'link' ? '' : sizes[size];
        const iconSize = size === 'icon' ? 18 : size === 'sm' ? 14 : 16;

        return (
            <button
                ref={ref}
                type={type}
                disabled={disabled || loading}
                className={cn(
                    baseClasses,
                    variants[variant],
                    sizeClasses,
                    shape === 'pill' ? 'rounded-full' : 'rounded-lg',
                    fullWidth && 'w-full',
                    loading && 'opacity-80 pointer-events-none',
                    className
                )}
                {...props}
            >
                {loading ? (
                    <Loader2 size={iconSize} className="animate-spin shrink-0" />
                ) : (
                    leftIcon && <span className="shrink-0 flex items-center justify-center">{leftIcon}</span>
                )}
                {children && (
                    <AppLabel as="span" className={cn("text-inherit font-semibold", size === 'sm' ? "text-[11px]" : "text-sm md:text-base")}>
                        {children}
                    </AppLabel>
                )}
                {!loading && rightIcon && (
                    <span className="shrink-0 flex items-center justify-center">{rightIcon}</span>
                )}
            </button>
        );
    }
);

AppButton.displayName = 'AppButton';

