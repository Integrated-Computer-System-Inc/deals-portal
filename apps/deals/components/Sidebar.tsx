'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Tooltip } from 'antd';
import { AppSidebar, useSidebar } from './ui/sidebar';
import { AppAvatar } from './ui/avatar';
import { AppButton } from './ui/buttons';
import { AppModal } from './ui/modal';
import {
  Home,
  FileSpreadsheet,
  PlusCircle,
  BarChart2,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  X,
} from 'lucide-react';
import { UserRole } from '@my-app/types';
import ThemeSwitcher from './ThemeSwitcher';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showSignOutConfirm, setShowSignOutConfirm] = React.useState(false);
  const { collapsed, toggleCollapsed, setMobileOpen, isMobile } = useSidebar();

  const userRole: UserRole = (session?.user as any)?.role || 'admin';
  const accountName = (session?.user as any)?.AccountName || (session?.user as any)?.name || '';
  const accountEmail = (session?.user as any)?.Email || session?.user?.email || '';
  const accountImage = (session?.user as any)?.GAvatar || session?.user?.image || undefined;
  const userBU = (session?.user as any)?.AccountGroup || 'HQ';

  const getRoleLabel = () => {
    if (userRole === 'admin') return 'Administrator';
    if (userRole === 'aa') return 'Sales AA';
    if (userRole === 'bu' || userRole === 'bu_admin') return 'BU Supervisor';
    return 'Account Officer';
  };

  const isViewOnly = status === 'authenticated' && (userRole === 'bu' || userRole === 'bu_admin' || userRole === 'ao');

  const menuItems = [
    {
      title: 'Home',
      href: '/dashboard',
      icon: <Home size={18} />,
    },
    {
      title: 'Deals Registry',
      href: '/deals',
      icon: <FileSpreadsheet size={18} />,
    },
    {
      title: 'Reports',
      href: '/reports',
      icon: <BarChart2 size={18} />,
    },
    ...(!isViewOnly
      ? [
          {
            title: 'Register Deal',
            href: '/deals/new',
            icon: <PlusCircle size={18} />,
          },
        ]
      : []),
  ];

  return (
    <>
      <AppSidebar className="border-r border-border bg-sidebar flex flex-col h-screen shrink-0">
        {/* Brand Header */}
        <AppSidebar.Header className={collapsed ? "p-3 border-b border-border/50 shrink-0" : "p-3.5 border-b border-border/50 shrink-0"}>
          {collapsed ? (
            /* Collapsed Header: Centered ICS Logo & Centered Expand Button */
            <div className="flex flex-col items-center justify-center gap-2.5 w-full">
              <Tooltip title="ICS Deal Registration" placement="right">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-sm tracking-wider shrink-0 cursor-default select-none mx-auto">
                  ICS
                </div>
              </Tooltip>

              <Tooltip title="Expand Sidebar" placement="right">
                <div>
                  <AppButton
                    variant="ghost"
                    size="icon"
                    onClick={toggleCollapsed}
                    className="text-muted hover:text-foreground hover:bg-neutral shrink-0 h-9 w-9 flex items-center justify-center rounded-lg mx-auto"
                    aria-label="Expand Sidebar"
                    leftIcon={<PanelLeft size={16} />}
                  />
                </div>
              </Tooltip>
            </div>
          ) : (
            /* Expanded Header: Full Brand Title & Collapse Button */
            <div className="flex items-center justify-between gap-2.5 w-full">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-sm tracking-wider shrink-0 select-none">
                  ICS
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm text-foreground tracking-tight leading-tight truncate">
                    Deal Registration
                  </span>
                  <span className="text-[10px] text-muted font-normal leading-tight truncate">
                    Integrated Computer Systems
                  </span>
                </div>
              </div>

              {!isMobile && (
                <Tooltip title="Collapse Sidebar" placement="right">
                  <div>
                    <AppButton
                      variant="ghost"
                      size="icon"
                      onClick={toggleCollapsed}
                      className="text-muted hover:text-foreground hover:bg-neutral shrink-0 h-8 w-8 flex items-center justify-center rounded-lg"
                      aria-label="Collapse Sidebar"
                      leftIcon={<PanelLeftClose size={16} />}
                    />
                  </div>
                </Tooltip>
              )}

              {isMobile && (
                <AppButton
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                  className="text-muted hover:text-foreground hover:bg-neutral shrink-0 h-8 w-8 flex items-center justify-center rounded-lg lg:hidden"
                  title="Close Menu"
                  aria-label="Close Menu"
                  leftIcon={<X size={18} />}
                />
              )}
            </div>
          )}
        </AppSidebar.Header>

        {/* Main Navigation */}
        <AppSidebar.Content className={collapsed ? "p-2 flex-1 flex flex-col items-center overflow-y-auto" : "p-2 flex-1 overflow-y-auto"}>
          <AppSidebar.Group className="w-full flex flex-col items-center">
            {!collapsed && (
              <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted w-full text-left">
                Menu
              </div>
            )}
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <div key={item.href} className="w-full flex justify-center">
                  <AppSidebar.Item
                    href={item.href}
                    icon={item.icon}
                    active={isActive}
                    onClick={() => setMobileOpen(false)}
                    tooltipPlacement="right"
                  >
                    {item.title}
                  </AppSidebar.Item>
                </div>
              );
            })}
          </AppSidebar.Group>
        </AppSidebar.Content>

        {/* Sticky User Footer */}
        <AppSidebar.Footer className={collapsed ? "p-2.5 border-t border-border/50 bg-sidebar shrink-0 mt-auto flex flex-col items-center justify-center" : "p-3 border-t border-border/50 bg-sidebar shrink-0 mt-auto"}>
          {collapsed ? (
            /* Collapsed Footer (Aligned along identical vertical axis) */
            <div className="flex flex-col items-center justify-center gap-2 w-full">
              <Tooltip title={`${accountName} (${getRoleLabel()})`} placement="right">
                <div className="flex items-center justify-center">
                  <AppAvatar
                    name={accountName}
                    src={accountImage}
                    size={34}
                    className="shrink-0 cursor-pointer mx-auto"
                  />
                </div>
              </Tooltip>

              <div className="flex flex-col items-center justify-center gap-1.5 mt-1 w-full">
                <div className="flex items-center justify-center">
                  <ThemeSwitcher />
                </div>
                <Tooltip title="Sign Out" placement="right">
                  <div>
                    <AppButton
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSignOutConfirm(true)}
                      className="text-muted hover:text-danger hover:bg-danger/10 shrink-0 h-9 w-9 flex items-center justify-center rounded-lg mx-auto"
                      aria-label="Sign Out"
                      leftIcon={<LogOut size={16} />}
                    />
                  </div>
                </Tooltip>
              </div>
            </div>
          ) : (
            /* Expanded Footer */
            <div className="flex items-center justify-between gap-2">
              {status === 'loading' ? (
                <div className="flex items-center gap-2.5 min-w-0 flex-1 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-neutral/80 shrink-0" />
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="h-3.5 bg-neutral/80 rounded w-24" />
                    <div className="h-2.5 bg-neutral/60 rounded w-16" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <AppAvatar
                    name={accountName || 'User'}
                    src={accountImage}
                    size={34}
                    className="shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate" title={accountName}>
                      {accountName || 'Administrator'}
                    </span>
                    <span className="text-[10px] text-muted truncate">
                      {getRoleLabel()}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0">
                <ThemeSwitcher />
                <Tooltip title="Sign Out" placement="top">
                  <div>
                    <AppButton
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSignOutConfirm(true)}
                      className="text-muted hover:text-danger hover:bg-danger/10 shrink-0 h-8 w-8 flex items-center justify-center rounded-lg"
                      aria-label="Sign Out"
                      leftIcon={<LogOut size={16} />}
                    />
                  </div>
                </Tooltip>
              </div>
            </div>
          )}
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
            <div className="h-10 w-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
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
