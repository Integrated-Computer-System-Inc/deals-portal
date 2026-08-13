'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { useSidebar } from './AppSidebarProvider';

export interface AppSidebarFooterProps {
    children: React.ReactNode;
    className?: string;
}

export default function AppSidebarFooter({ children, className }: AppSidebarFooterProps) {
    const { collapsed } = useSidebar();

    return (
        <div
            className={cn(
                "p-4 border-t border-border mt-auto shrink-0 transition-all duration-300",
                collapsed ? "flex justify-center p-2 pt-4" : "",
                className
            )}
        >
            {children}
        </div>
    );
}
