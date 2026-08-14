'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { AppSidebarProvider } from './ui';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
        {children}
      </div>
    );
  }

  return (
    <AppSidebarProvider>
      <div className="h-screen w-screen flex bg-background text-foreground transition-colors duration-200 overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 h-screen overflow-y-auto p-4 sm:p-6 lg:p-8 bg-neutral/30">
          <div className="max-w-7xl mx-auto space-y-6 pb-12">
            {children}
          </div>
        </main>
      </div>
    </AppSidebarProvider>
  );
}
