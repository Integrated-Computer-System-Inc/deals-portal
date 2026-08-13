'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  AppSidebar,
  AppAvatar,
  AppButton,
  AppModal,
  AppDivider,
} from './ui';
import {
  LayoutDashboard,
  FileSpreadsheet,
  PlusCircle,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { UserRole } from '@my-app/types';
import ThemeSwitcher from './ThemeSwitcher';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [showSignOutConfirm, setShowSignOutConfirm] = React.useState(false);

  const userRole: UserRole = (session?.user as any)?.role || 'admin';
  const accountName = (session?.user as any)?.AccountName || session?.user?.name || 'Demo User';
  const accountEmail = session?.user?.email || 'user@ics.com.ph';
  const accountImage = session?.user?.image || undefined;

  const getRoleLabel = () => {
    if (userRole === 'admin') return 'Administrator';
    if (userRole === 'bu_admin') return 'BU Supervisor';
    return 'Account Officer';
  };

  const menuItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard size={18} />,
    },
    {
      title: 'Deals Registry',
      href: '/deals',
      icon: <FileSpreadsheet size={18} />,
    },
    {
      title: 'Register Deal',
      href: '/deals/new',
      icon: <PlusCircle size={18} />,
    },
  ];

  return (
    <>
      <AppSidebar className="border-r border-border bg-sidebar flex flex-col h-screen shrink-0">
        {/* Brand Header */}
        <AppSidebar.Header className="p-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-sm tracking-wider shrink-0">
              ICS
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-foreground tracking-tight leading-tight">
                Deal Registration
              </span>
              <span className="text-[11px] text-muted font-normal leading-tight">
                Integrated Computer Systems, Inc.
              </span>
            </div>
          </div>
        </AppSidebar.Header>

        {/* Theme Switcher — Below Header */}
        <div className="px-3 py-2.5 border-b border-border/40 shrink-0">
          <ThemeSwitcher />
        </div>

        {/* Main Navigation */}
        <AppSidebar.Content className="p-2 flex-1 overflow-y-auto">
          <AppSidebar.Group>
            <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
              Menu
            </div>
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className="block w-full no-underline">
                  <AppSidebar.Item
                    icon={item.icon}
                    active={isActive}
                  >
                    {item.title}
                  </AppSidebar.Item>
                </Link>
              );
            })}
          </AppSidebar.Group>
        </AppSidebar.Content>

        {/* Sticky User Footer - Aligned with username & icon button */}
        <AppSidebar.Footer className="p-3 border-t border-border/50 bg-sidebar shrink-0 mt-auto">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <AppAvatar
                name={accountName}
                src={accountImage}
                size={34}
                className="shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-foreground truncate" title={accountName}>
                  {accountName}
                </span>
                <span className="text-[10px] text-muted truncate">
                  {getRoleLabel()}
                </span>
              </div>
            </div>

            <AppButton
              variant="ghost"
              size="icon"
              onClick={() => setShowSignOutConfirm(true)}
              className="text-muted hover:text-danger hover:bg-danger/10 shrink-0 h-8 w-8 rounded-lg"
              title="Sign Out"
              aria-label="Sign Out"
              leftIcon={<LogOut size={16} />}
            />
          </div>
        </AppSidebar.Footer>
      </AppSidebar>

      {/* Sign Out Confirmation Modal */}
      <AppModal
        open={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        width={420}
      >
        <AppModal.Header>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
              <LogOut size={20} />
            </div>
            <div>
              <AppModal.Title>Sign Out</AppModal.Title>
              <AppModal.Description>
                Are you sure you want to sign out of Deal Registration?
              </AppModal.Description>
            </div>
          </div>
        </AppModal.Header>

        <AppModal.Footer className="flex justify-end gap-2 mt-6">
          <AppButton
            variant="neutral"
            size="sm"
            onClick={() => setShowSignOutConfirm(false)}
          >
            Cancel
          </AppButton>
          <AppButton
            variant="danger"
            size="sm"
            leftIcon={<LogOut size={14} />}
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            Sign Out
          </AppButton>
        </AppModal.Footer>
      </AppModal>
    </>
  );
}
