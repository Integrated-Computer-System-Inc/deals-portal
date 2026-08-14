'use client';

import React from 'react';
import { cn } from '../../utils/cn';

type AsType = 'span' | 'p' | 'label' | 'h1' | 'h2' | 'h3' | 'h4' | 'div';

export type AppLabelProps<T extends AsType = 'span'> = {
    as?: T;
    variant?: 'title' | 'subtitle' | 'body' | 'caption' | 'description' | 'label' | 'info';
} & React.ComponentPropsWithoutRef<T>;

const defaultSizesPx = {
    title: 16,
    subtitle: 14,
    body: 14,
    caption: 10,
    label: 14,
    info: 11,
    description: 13
};

function getBaseSizeFromClassName(className?: string): number | null {
    if (!className) return null;

    // Exact checks for our mapped classes to maintain pixel-perfect behavior
    if (/\btext-\[10px\]/.test(className)) return 10;
    if (/\btext-\[11px\]/.test(className)) return 11;
    if (/\btext-\[13px\]/.test(className)) return 13;
    if (/\btext-sm\b/.test(className)) return 14;
    if (/\btext-base\b/.test(className)) return 16;
    if (/\btext-lg\b/.test(className)) return 18;
    if (/\btext-xl\b/.test(className)) return 20;
    if (/\btext-2xl\b/.test(className)) return 24;

    // Standard Tailwind classes if they are used elsewhere
    if (/\btext-xs\b/.test(className)) return 12;
    if (/\btext-3xl\b/.test(className)) return 30;

    // Arbitrary pixel matching for safety: e.g. text-[15px]
    const pixelMatch = className.match(/\btext-\[(\d+)px\]/);
    if (pixelMatch) {
        return parseInt(pixelMatch[1], 10);
    }

    return null;
}

export const AppLabel = <T extends AsType = 'span'>({
    as,
    variant = 'body',
    className,
    children,
    style,
    ...props
}: AppLabelProps<T>) => {
    const Component = (as || 'span') as React.ElementType;

    const variants = {
        title: 'text-foreground font-bold',
        subtitle: 'text-foreground font-bold',
        body: 'leading-relaxed text-text',
        caption: 'leading-normal text-muted-foreground/30',
        label: 'block text-foreground/70 font-medium',
        info: 'leading-relaxed text-text-info',
        description: 'leading-relaxed text-foreground/50'
    };

    const defaultSizes = {
        title: 'text-base md:text-lg',
        subtitle: 'text-sm md:text-base',
        body: 'text-sm md:text-base',
        caption: 'text-xs',
        label: 'text-sm',
        info: 'text-sm',
        description: 'text-sm'
    };

    const customBaseSize = getBaseSizeFromClassName(className);
    const baseSize = customBaseSize !== null ? customBaseSize : defaultSizesPx[variant];

    return (
        <Component
            className={cn(
                variants[variant],
                customBaseSize === null && defaultSizes[variant],
                className
            )}
            style={{
                fontSize: `calc(${baseSize}px + var(--font-scale, 0px))`,
                ...style
            }}
            {...props}
        >
            {children}
        </Component>
    );
};
