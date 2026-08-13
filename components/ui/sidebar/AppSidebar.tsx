'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { AppSidebarProvider, useSidebar, SidebarContext } from './AppSidebarProvider';

export interface AppSidebarProps {
    collapsed?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
    mobileOpen?: boolean;
    onMobileOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
    className?: string;
}

const SidebarInner = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const { collapsed, mobileOpen, setMobileOpen } = useSidebar();

    return (
        <>
            {/* Desktop Sidebar Shell */}
            <aside
                className={cn(
                    "hidden lg:flex flex-col h-screen border-r border-border bg-sidebar transition-all duration-300 ease-in-out shrink-0",
                    collapsed ? "w-[72px]" : "w-72",
                    className
                )}
            >
                {children}
            </aside>

            {/* Mobile Drawer Slide-out and Overlay (custom transition instead of AppDrawer) */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 lg:hidden",
                    mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setMobileOpen(false)}
            />
            <div
                className={cn(
                    "fixed top-0 bottom-0 left-0 w-[300px] bg-sidebar border-r border-border z-50 flex flex-col transition-transform duration-300 ease-in-out lg:hidden",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* For mobile view, override the collapsed context to always render as expanded (false) */}
                <SidebarContext.Provider
                    value={{
                        collapsed: false,
                        setCollapsed: () => {},
                        mobileOpen,
                        setMobileOpen,
                        isMobile: true,
                    }}
                >
                    {children}
                </SidebarContext.Provider>
            </div>
        </>
    );
};

export default function AppSidebar({
    collapsed,
    onCollapsedChange,
    mobileOpen,
    onMobileOpenChange,
    children,
    className,
}: AppSidebarProps) {
    return (
        <AppSidebarProvider
            collapsed={collapsed}
            onCollapsedChange={onCollapsedChange}
            mobileOpen={mobileOpen}
            onMobileOpenChange={onMobileOpenChange}
        >
            <SidebarInner className={className}>{children}</SidebarInner>
        </AppSidebarProvider>
    );
}
