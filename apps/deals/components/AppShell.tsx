'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
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
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 h-screen overflow-y-auto p-3.5 sm:p-5 lg:p-6 bg-background">
          <div className="max-w-[1440px] mx-auto space-y-4 pb-12">
            <Breadcrumbs />
            {children}
          </div>
        </main>
      </div>
    </AppSidebarProvider>
  );
}
