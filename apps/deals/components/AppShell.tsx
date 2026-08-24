'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
import { AppSidebarProvider } from './ui/sidebar';
import { useSession } from 'next-auth/react';
import { useDealsQuery, useDashboardQuery, useCurrentUserFilter } from '@/hooks/useDealsQuery';

function DealsCachePrewarmer() {
  const { status } = useSession();
  const scopedFilter = useCurrentUserFilter();

  useDealsQuery(scopedFilter, { enabled: status === 'authenticated' });
  useDashboardQuery({ enabled: status === 'authenticated' });

  return null;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLoginPage = !pathname || pathname === '/login' || pathname.startsWith('/login') || pathname.startsWith('/api/auth');

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
        {children}
      </div>
    );
  }

  return (
    <AppSidebarProvider>
      <DealsCachePrewarmer />
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
