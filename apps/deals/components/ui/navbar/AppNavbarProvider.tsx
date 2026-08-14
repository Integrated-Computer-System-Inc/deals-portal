'use client';

import React, { createContext, useContext, useState } from 'react';

export interface NavbarContextType {
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
    sticky?: boolean;
    isMobile?: boolean;
}

export const NavbarContext = createContext<NavbarContextType | undefined>(undefined);

export const useNavbar = () => {
    const context = useContext(NavbarContext);
    if (!context) {
        throw new Error('useNavbar must be used within an AppNavbarProvider');
    }
    return context;
};

export interface AppNavbarProviderProps {
    children: React.ReactNode;
    mobileOpen?: boolean;
    onMobileOpenChange?: (open: boolean) => void;
    sticky?: boolean;
    isMobile?: boolean;
}

export const AppNavbarProvider = ({
    children,
    mobileOpen: controlledMobileOpen,
    onMobileOpenChange,
    sticky = true,
    isMobile = false,
}: AppNavbarProviderProps) => {
    const [localMobileOpen, setLocalMobileOpen] = useState(false);

    const mobileOpen = controlledMobileOpen !== undefined ? controlledMobileOpen : localMobileOpen;

    const setMobileOpen = (o: boolean) => {
        if (onMobileOpenChange) {
            onMobileOpenChange(o);
        } else {
            setLocalMobileOpen(o);
        }
    };

    return (
        <NavbarContext.Provider
            value={{
                mobileOpen,
                setMobileOpen,
                sticky,
                isMobile,
            }}
        >
            {children}
        </NavbarContext.Provider>
    );
};
