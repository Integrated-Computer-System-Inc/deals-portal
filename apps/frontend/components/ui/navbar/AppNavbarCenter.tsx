'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { useNavbar } from './AppNavbarProvider';

export interface AppNavbarCenterProps {
    children: React.ReactNode;
    className?: string;
}

export default function AppNavbarCenter({ children, className }: AppNavbarCenterProps) {
    const { isMobile } = useNavbar();

    return (
        <div
            className={cn(
                isMobile ? "flex flex-col gap-4 items-start w-full" : "hidden md:flex items-center gap-6 justify-center flex-1",
                className
            )}
        >
            {children}
        </div>
    );
}
