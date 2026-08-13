'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { useNavbar } from './AppNavbarProvider';

export interface AppNavbarLeftProps {
    children: React.ReactNode;
    className?: string;
}

export default function AppNavbarLeft({ children, className }: AppNavbarLeftProps) {
    const { isMobile } = useNavbar();
    if (isMobile) return null;

    return (
        <div className={cn("flex items-center gap-4 flex-1 justify-start min-w-0", className)}>
            {children}
        </div>
    );
}
