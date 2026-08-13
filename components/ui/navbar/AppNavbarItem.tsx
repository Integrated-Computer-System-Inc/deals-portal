'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { AppLabel } from '../labels';

export interface AppNavbarItemProps {
    icon?: React.ReactNode;
    active?: boolean;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    children?: React.ReactNode; // label
    className?: string;
    disabled?: boolean;
}

export default function AppNavbarItem({
    icon,
    active = false,
    onClick,
    children,
    className,
    disabled = false,
}: AppNavbarItemProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "flex items-center gap-2 text-sm font-medium transition-all duration-200 cursor-pointer select-none",
                "px-3 py-1.5 rounded-full",
                active
                    ? "bg-[#223A5E] text-white"
                    : "text-foreground/80 hover:bg-neutral hover:text-foreground",
                "disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                className
            )}
        >
            {icon && <span className="shrink-0 flex items-center justify-center">{icon}</span>}
            {children && (
                <AppLabel as="span" className="truncate text-inherit font-medium">
                    {children}
                </AppLabel>
            )}
        </button>
    );
}
