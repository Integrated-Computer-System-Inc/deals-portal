'use client';

import React, { useContext } from 'react';
import { cn } from '../../utils/cn';
import { AppSidebarProvider, useSidebar } from './AppSidebarProvider';

export interface AppSidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

const SidebarInner = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const { collapsed } = useSidebar();

  return (
    <aside
      className={cn(
        'flex flex-col h-screen sticky top-0 border-r border-border bg-sidebar transition-all duration-300 ease-in-out shrink-0 z-40 select-none',
        collapsed ? 'w-[72px]' : 'w-64',
        className
      )}
    >
      {children}
    </aside>
  );
};

export default function AppSidebar({
  collapsed,
  onCollapsedChange,
  children,
  className,
}: AppSidebarProps) {
  const existingContext = useContext(useSidebar as any);

  return <SidebarInner className={className}>{children}</SidebarInner>;
}
