'use client';

import React from 'react';
import { cn } from '../../utils/cn';

export interface AppDividerProps {
    className?: string;
    orientation?: 'horizontal' | 'vertical';
    children?: React.ReactNode;
    dashed?: boolean;
}

export const AppDivider = ({
    className,
    orientation = 'horizontal',
    children,
    dashed = false,
}: AppDividerProps) => {
    const isHorizontal = orientation === 'horizontal';

    if (children && isHorizontal) {
        return (
            <div className={cn("flex items-center w-full my-4 text-xs text-foreground/40 font-medium", className)}>
                <div className={cn(
                    "flex-1 border-t border-border/60",
                    dashed && "border-dashed"
                )} />
                <span className="px-3 shrink-0 uppercase tracking-wider">{children}</span>
                <div className={cn(
                    "flex-1 border-t border-border/60",
                    dashed && "border-dashed"
                )} />
            </div>
        );
    }

    return (
        <div
            className={cn(
                isHorizontal 
                    ? "w-full border-t border-border/60 my-4" 
                    : "h-full min-h-[1em] border-l border-border/60 mx-4 self-stretch",
                dashed && "border-dashed",
                className
            )}
        />
    );
};
