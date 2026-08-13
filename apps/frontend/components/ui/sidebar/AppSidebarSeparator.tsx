'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { useSidebar } from './AppSidebarProvider';

export interface AppSidebarSeparatorProps {
    className?: string;
}

export default function AppSidebarSeparator({ className }: AppSidebarSeparatorProps) {
    const { collapsed } = useSidebar();
    
    return (
        <div
            className={cn(
                "bg-border shrink-0 transition-all duration-300",
                collapsed ? "w-8 h-px my-3" : "w-full h-px my-4 opacity-50",
                className
            )}
        />
    );
}
