'use client';

import React, { createContext, useContext, useState } from 'react';

export interface SidebarContextType {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
    isMobile?: boolean;
}

export const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within an AppSidebarProvider');
    }
    return context;
};

export interface AppSidebarProviderProps {
    children: React.ReactNode;
    collapsed?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
    mobileOpen?: boolean;
    onMobileOpenChange?: (open: boolean) => void;
}

export const AppSidebarProvider = ({
    children,
    collapsed: controlledCollapsed,
    onCollapsedChange,
    mobileOpen: controlledMobileOpen,
    onMobileOpenChange,
}: AppSidebarProviderProps) => {
    const [localCollapsed, setLocalCollapsed] = useState(false);
    const [localMobileOpen, setLocalMobileOpen] = useState(false);

    const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : localCollapsed;
    const mobileOpen = controlledMobileOpen !== undefined ? controlledMobileOpen : localMobileOpen;

    const setCollapsed = (c: boolean) => {
        if (onCollapsedChange) {
            onCollapsedChange(c);
        } else {
            setLocalCollapsed(c);
        }
    };

    const setMobileOpen = (o: boolean) => {
        if (onMobileOpenChange) {
            onMobileOpenChange(o);
        } else {
            setLocalMobileOpen(o);
        }
    };

    return (
        <SidebarContext.Provider
            value={{
                collapsed,
                setCollapsed,
                mobileOpen,
                setMobileOpen,
                isMobile: false,
            }}
        >
            {children}
        </SidebarContext.Provider>
    );
};
