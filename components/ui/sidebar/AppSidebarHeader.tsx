'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { useSidebar } from './AppSidebarProvider';

export interface AppSidebarHeaderProps {
    children: React.ReactNode;
    className?: string;
}

export default function AppSidebarHeader({ children, className }: AppSidebarHeaderProps) {
    const { collapsed } = useSidebar();
    
    return (
        <div
            className={cn(
                "p-4 flex flex-col shrink-0 transition-all duration-300",
                collapsed ? "items-center pt-5 pb-2 gap-2" : "gap-4",
                className
            )}
        >
            {children}
        </div>
    );
}
