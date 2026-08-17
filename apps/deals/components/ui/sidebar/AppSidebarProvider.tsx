'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobileOpen: () => void;
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
  const [mounted, setMounted] = useState(false);

  // Restore sidebar state from localStorage on client mount
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('dealreg-sidebar-collapsed');
      if (saved !== null) {
        setLocalCollapsed(saved === 'true');
      }
    } catch (e) {}
  }, []);

  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : (mounted ? localCollapsed : false);
  const mobileOpen = controlledMobileOpen !== undefined ? controlledMobileOpen : localMobileOpen;

  const setCollapsed = (c: boolean) => {
    if (onCollapsedChange) {
      onCollapsedChange(c);
    } else {
      setLocalCollapsed(c);
      try {
        localStorage.setItem('dealreg-sidebar-collapsed', String(c));
      } catch (e) {}
    }
  };

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const setMobileOpen = (o: boolean) => {
    if (onMobileOpenChange) {
      onMobileOpenChange(o);
    } else {
      setLocalMobileOpen(o);
    }
  };

  const toggleMobileOpen = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        setCollapsed,
        toggleCollapsed,
        mobileOpen,
        setMobileOpen,
        toggleMobileOpen,
        isMobile: false,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
