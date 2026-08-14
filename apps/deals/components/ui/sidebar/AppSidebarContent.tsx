'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { useSidebar } from './AppSidebarProvider';

export interface AppSidebarContentProps {
    children: React.ReactNode;
    className?: string;
}

export default function AppSidebarContent({ children, className }: AppSidebarContentProps) {
    const { collapsed } = useSidebar();

    return (
        <div
            className={cn(
                "flex-1 w-full overflow-y-auto pr-0.5 custom-scrollbar flex flex-col gap-4 min-h-0",
                collapsed ? "px-2 py-1 items-center" : "px-4 py-2",
                className
            )}
        >
            {children}
        </div>
    );
}
