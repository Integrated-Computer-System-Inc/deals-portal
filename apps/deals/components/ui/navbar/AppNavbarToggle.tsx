'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { useNavbar } from './AppNavbarProvider';
import { Menu, X } from 'lucide-react';
import { AppButton } from '../buttons';

export interface AppNavbarToggleProps {
    className?: string;
}

export default function AppNavbarToggle({ className }: AppNavbarToggleProps) {
    const { mobileOpen, setMobileOpen, isMobile } = useNavbar();

    if (isMobile) return null;

    return (
        <AppButton
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            className={cn("md:hidden shrink-0", className)}
            title={mobileOpen ? "Close Menu" : "Open Menu"}
        >
            {mobileOpen ? (
                <X size={20} className="transition-colors text-gray-400 hover:text-foreground" />
            ) : (
                <Menu size={20} className="transition-colors text-gray-400 hover:text-foreground" />
            )}
        </AppButton>
    );
}
