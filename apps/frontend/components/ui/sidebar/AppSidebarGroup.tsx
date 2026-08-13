'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { useSidebar } from './AppSidebarProvider';
import { AppLabel } from '../labels';

export interface AppSidebarGroupProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
    titleClassName?: string;
}

export default function AppSidebarGroup({
    title,
    children,
    className,
    titleClassName,
}: AppSidebarGroupProps) {
    const { collapsed } = useSidebar();

    return (
        <div className={cn("flex flex-col w-full", className)}>
            {title && !collapsed && (
                <AppLabel as="h3" variant="title" className={cn("uppercase tracking-wider text-gray-400/80 mb-2 px-1", titleClassName, 'text-[11px]')}>
                    {title}
                </AppLabel>
            )}
            <div className="flex flex-col gap-0.5 w-full">
                {children}
            </div>
        </div>
    );
}
