'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { useSidebar } from './AppSidebarProvider';
import { Tooltip } from 'antd';
import { AppLabel } from '../labels';

export interface AppSidebarItemProps {
    icon?: React.ReactNode;
    active?: boolean;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    actions?: React.ReactNode;
    children?: React.ReactNode; // label
    className?: string;
    tooltipPlacement?: 'right' | 'top' | 'bottom' | 'left';
    disabled?: boolean;
}

export default function AppSidebarItem({
    icon,
    active = false,
    onClick,
    actions,
    children,
    className,
    tooltipPlacement = 'right',
    disabled = false,
}: AppSidebarItemProps) {
    const { collapsed } = useSidebar();

    const baseItemStyles = cn(
        "flex items-center text-sm transition-all duration-200 text-left w-full group relative my-0.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        collapsed
            ? cn(
                "justify-center h-10 w-10 rounded-full p-0 gap-0",
                active
                    ? "bg-sidebar-active text-sidebar-active-text"
                    : "text-gray-400 hover:bg-hover/40 hover:text-foreground"
            )
            : cn(
                "gap-2.5",
                active
                    ? "bg-sidebar-active text-sidebar-active-text rounded-full px-4 py-2 font-medium"
                    : "px-4 py-2 rounded-full text-text hover:bg-hover/40"
            ),
        className
    );

    const buttonContent = (
        <button
            onClick={onClick}
            disabled={disabled}
            className={baseItemStyles}
        >
            {icon && <span className="shrink-0 flex items-center justify-center">{icon}</span>}

            {!collapsed && (
                <>
                    <AppLabel as="span" className="truncate flex-1 font-medium text-inherit">
                        {children}
                    </AppLabel>
                    {actions && (
                        <span onClick={(e) => e.stopPropagation()} className="shrink-0 ml-auto flex items-center">
                            {actions}
                        </span>
                    )}
                </>
            )}
        </button>
    );

    if (collapsed && children) {
        return (
            <Tooltip title={children} placement={tooltipPlacement} mouseEnterDelay={0.3}>
                {buttonContent}
            </Tooltip>
        );
    }

    return buttonContent;
}
