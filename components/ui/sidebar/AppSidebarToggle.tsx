'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { useSidebar } from './AppSidebarProvider';
import { PanelLeft, PanelLeftClose } from 'lucide-react';
import { AppButton } from '../buttons';

export interface AppSidebarToggleProps {
    className?: string;
    isMobile?: boolean;
    onCloseMobile?: () => void;
}

export default function AppSidebarToggle({ className, isMobile = false, onCloseMobile }: AppSidebarToggleProps) {
    const { collapsed, setCollapsed } = useSidebar();

    const handleToggle = () => {
        if (isMobile && onCloseMobile) {
            onCloseMobile();
        } else {
            setCollapsed(!collapsed);
        }
    };

    return (
        <AppButton
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            className={cn(
                collapsed ? "mb-2" : "shrink-0",
                className
            )}
            title={isMobile ? "Close Sidebar" : collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
            {isMobile ? (
                <PanelLeftClose size={18} className="transition-colors group-hover:text-accent-1 text-gray-400" />
            ) : collapsed ? (
                <PanelLeft size={20} className="transition-colors group-hover:text-accent-1 text-gray-400" />
            ) : (
                <PanelLeftClose size={18} className="transition-colors group-hover:text-accent-1 text-gray-400" />
            )}
        </AppButton>
    );
}
