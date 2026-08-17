'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '../../utils/cn';
import { useSidebar } from './AppSidebarProvider';
import { Tooltip } from 'antd';

export interface AppSidebarItemProps {
    href?: string;
    icon?: React.ReactNode;
    active?: boolean;
    onClick?: (e: React.MouseEvent<HTMLElement>) => void;
    actions?: React.ReactNode;
    children?: React.ReactNode; // label
    className?: string;
    tooltipPlacement?: 'right' | 'top' | 'bottom' | 'left';
    disabled?: boolean;
}

export default function AppSidebarItem({
    href,
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
    const router = useRouter();

    const baseItemStyles = cn(
        "flex items-center text-sm transition-colors duration-150 group relative my-0.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 no-underline",
        collapsed
            ? cn(
                "justify-center h-10 w-10 mx-auto rounded-full p-0 gap-0 text-center",
                active
                    ? "bg-sidebar-active text-white shadow-xs font-semibold"
                    : "text-muted hover:bg-neutral hover:text-foreground"
            )
            : cn(
                "gap-2.5 text-left w-full",
                active
                    ? "bg-sidebar-active text-white rounded-full px-4 py-2 font-semibold shadow-xs"
                    : "px-4 py-2 rounded-full text-foreground hover:bg-neutral"
            ),
        className
    );

    const innerContent = (
        <>
            {icon && (
                <span className={cn("shrink-0 flex items-center justify-center", active ? "!text-white" : "text-inherit")}>
                    {icon}
                </span>
            )}

            {!collapsed && (
                <>
                    <span className={cn("truncate flex-1 font-medium text-sm", active ? "!text-white font-semibold" : "text-inherit")}>
                        {children}
                    </span>
                    {actions && (
                        <span onClick={(e) => e.stopPropagation()} className="shrink-0 ml-auto flex items-center">
                            {actions}
                        </span>
                    )}
                </>
            )}
        </>
    );

    let element: React.ReactNode;

    if (href && !disabled) {
        element = (
            <Link
                href={href}
                prefetch={true}
                onClick={onClick}
                onMouseEnter={() => router.prefetch(href)}
                onPointerDown={() => router.prefetch(href)}
                className={baseItemStyles}
            >
                {innerContent}
            </Link>
        );
    } else {
        element = (
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                className={baseItemStyles}
            >
                {innerContent}
            </button>
        );
    }

    if (collapsed && children) {
        return (
            <Tooltip title={children} placement={tooltipPlacement} mouseEnterDelay={0.2}>
                <div className="flex justify-center w-full">
                    {element}
                </div>
            </Tooltip>
        );
    }

    return element;
}
