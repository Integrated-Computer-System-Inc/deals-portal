'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { AppNavbarProvider, useNavbar, NavbarContext } from './AppNavbarProvider';
import { AppDrawer } from '../drawer';

export interface AppNavbarProps {
    mobileOpen?: boolean;
    onMobileOpenChange?: (open: boolean) => void;
    sticky?: boolean;
    children: React.ReactNode;
    className?: string;
}

const NavbarInner = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const { mobileOpen, setMobileOpen, sticky } = useNavbar();

    return (
        <>
            {/* Main Navbar Header */}
            <header
                className={cn(
                    "w-full h-16 border-b border-border bg-background flex items-center px-4 md:px-6 transition-all duration-300",
                    sticky && "sticky top-0 z-40",
                    className
                )}
            >
                {children}
            </header>

            {/* Mobile Navigation Drawer */}
            <AppDrawer
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                placement="right"
                width={280}
            >
                <NavbarContext.Provider
                    value={{
                        mobileOpen,
                        setMobileOpen,
                        sticky: false,
                        isMobile: true,
                    }}
                >
                    <div className="flex flex-col gap-6 py-4">
                        {children}
                    </div>
                </NavbarContext.Provider>
            </AppDrawer>
        </>
    );
};

export default function AppNavbar({
    mobileOpen,
    onMobileOpenChange,
    sticky = true,
    children,
    className,
}: AppNavbarProps) {
    return (
        <AppNavbarProvider
            mobileOpen={mobileOpen}
            onMobileOpenChange={onMobileOpenChange}
            sticky={sticky}
        >
            <NavbarInner className={className}>{children}</NavbarInner>
        </AppNavbarProvider>
    );
}
