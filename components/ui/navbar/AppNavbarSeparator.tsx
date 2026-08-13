'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { useNavbar } from './AppNavbarProvider';

export interface AppNavbarSeparatorProps {
    className?: string;
}

export default function AppNavbarSeparator({ className }: AppNavbarSeparatorProps) {
    const { isMobile } = useNavbar();
    return (
        <div
            className={cn(
                isMobile
                    ? "w-full h-px bg-border my-2 block"
                    : "hidden sm:block w-px h-6 bg-border shrink-0 opacity-60 mx-2",
                className
            )}
        />
    );
}
