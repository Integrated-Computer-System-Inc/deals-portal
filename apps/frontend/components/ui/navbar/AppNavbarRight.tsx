'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { useNavbar } from './AppNavbarProvider';

export interface AppNavbarRightProps {
    children: React.ReactNode;
    className?: string;
}

export default function AppNavbarRight({ children, className }: AppNavbarRightProps) {
    const { isMobile } = useNavbar();

    return (
        <div
            className={cn(
                isMobile ? "flex flex-col gap-4 items-start w-full border-t border-border pt-4 mt-4" : "flex items-center gap-4 flex-1 justify-end",
                className
            )}
        >
            {children}
        </div>
    );
}
