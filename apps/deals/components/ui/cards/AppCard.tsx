'use client';

import React from 'react';
import { cn } from '../../utils/cn';

export interface AppCardProps extends React.HTMLAttributes<HTMLElement> {
    variant?: 'default' | 'interactive' | 'glass' | 'bordered' | 'nested';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    as?: React.ElementType;
    href?: string;
    target?: string;
    rel?: string;
}

export const AppCard = React.forwardRef<HTMLElement, AppCardProps>(
    (
        {
            className,
            variant = 'default',
            padding = 'md',
            as: Component = 'div',
            children,
            ...props
        },
        ref
    ) => {
        const baseClasses = 'rounded-2xl border transition-all duration-200';

        const variants = {
            default: 'bg-neutral/20 border-border',
            interactive: 'bg-neutral/20 border-border hover:border-accent-1/25 hover:bg-neutral/40 hover:-translate-y-[1px] hover:shadow-sm cursor-pointer',
            glass: 'bg-background/60 backdrop-blur-md border-border/80 shadow-md',
            bordered: 'bg-transparent border-border',
            nested: 'bg-neutral/10 border-border/50'
        };

        const paddings = {
            none: 'p-0',
            sm: 'p-3 md:p-4',
            md: 'p-4 md:p-6',
            lg: 'p-6 md:p-8'
        };

        return (
            <Component
                ref={ref}
                className={cn(
                    baseClasses,
                    variants[variant as keyof typeof variants],
                    paddings[padding as keyof typeof paddings],
                    className
                )}
                {...props}
            >
                {children}
            </Component>
        );
    }
);

AppCard.displayName = 'AppCard';
