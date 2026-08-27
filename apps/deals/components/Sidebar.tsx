'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { UserRole } from '@my-app/types';
import ThemeSwitcher from './ThemeSwitcher';
import { useQueryClient } from '@tanstack/react-query';
import { DEAL_QUERY_KEYS } from '@/hooks/useDealsQuery';
import { getDashboardSummary, getScopedDeals } from '@/app/actions/deals';

const DEAL_STATUS_FILTERS = [
  { id: '1', label: 'Registered', color: 'bg-emerald-500' },
  { id: '4', label: 'Pending', color: 'bg-amber-500' },
  { id: '3', label: 'Waiting', color: 'bg-sky-500' },
  { id: '6', label: 'Won', color: 'bg-indigo-500' },
  { id: '7', label: 'Lost', color: 'bg-rose-600' },
  { id: '5', label: 'Expired', color: 'bg-zinc-400' },
  { id: '2', label: 'Declined', color: 'bg-rose-500' },
  { id: '8', label: 'Cancelled', color: 'bg-zinc-500' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatusParam = searchParams?.get('status') || '';
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const [showSignOutConfirm, setShowSignOutConfirm] = React.useState(false);
  const { collapsed, toggleCollapsed, setMobileOpen, isMobile } = useSidebar();

  const isDealsPage = pathname === '/deals' || pathname.startsWith('/deals/');
  const [isDealsSubmenuOpen, setIsDealsSubmenuOpen] = React.useState(isDealsPage);

  // Sync open state when navigating across routes: auto-open on Deals page, auto-close on other pages
  React.useEffect(() => {
    setIsDealsSubmenuOpen(isDealsPage);
  }, [isDealsPage]);

  const userRole: UserRole = (session?.user as any)?.role || 'admin';
  const accountName = (session?.user as any)?.AccountName || (session?.user as any)?.name || '';
  const accountEmail = (session?.user as any)?.Email || session?.user?.email || '';
  const accountImage = (session?.user as any)?.GAvatar || session?.user?.image || undefined;
  const userBU = (session?.user as any)?.AccountGroup || 'HQ';

  const scopedFilter = React.useMemo(
    () => ({
      userRole,
      accountName,
      accountGroup: userBU,
    }),
    [userRole, accountName, userBU]
  );

  const handlePrefetchData = (href: string) => {
    if (href === '/dashboard') {
      queryClient.prefetchQuery({
        queryKey: DEAL_QUERY_KEYS.dashboard(),
        queryFn: async () => {
          const res = await getDashboardSummary();
          return res.data;
        },
        staleTime: 1000 * 60 * 5,
      });
    } else if (href === '/deals' || href === '/reports') {
      queryClient.prefetchQuery({
        queryKey: DEAL_QUERY_KEYS.list(scopedFilter),
        queryFn: async () => {
          const res = await getScopedDeals(scopedFilter);
          return res.data || [];
        },
        staleTime: 1000 * 60 * 5,
      });
    }
  };

  const getRoleLabel = () => {
    if (userRole === 'admin') return 'Administrator';
    if (userRole === 'aa') return 'Admin Assistant';
    if (userRole === 'bu' || userRole === 'bu_admin') {
      return userBU && userBU !== 'HQ' ? `BU Head (${userBU})` : 'BU Head';
    }
    return 'Account Officer';
  };

  const isViewOnly = status === 'authenticated' && (userRole === 'bu' || userRole === 'bu_admin' || userRole === 'ao');

  // Pre-load all main navigation route chunks in background on mount
  React.useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/deals');
    router.prefetch('/reports');
    if (!isViewOnly) {
      router.prefetch('/deals/new');
    }
  }, [router, isViewOnly]);

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
          <AppSidebar.Group className="w-full flex flex-col items-center space-y-1">
            {!collapsed && (
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted w-full text-left">
                Menu
              </div>
            )}

            {/* 1. Home */}
            <div
              className="w-full flex justify-center"
              onMouseEnter={() => handlePrefetchData('/dashboard')}
              onFocus={() => handlePrefetchData('/dashboard')}
            >
              <AppSidebar.Item
                href="/dashboard"
                icon={<Home size={18} />}
                active={pathname === '/dashboard'}
                onClick={() => setMobileOpen(false)}
                tooltipPlacement="right"
              >
                Home
              </AppSidebar.Item>
            </div>

            {/* 2. Deals Registry & Nested Status Filtering */}
            <div className="w-full flex flex-col items-center">
              <div
                className="w-full flex justify-center"
                onMouseEnter={() => handlePrefetchData('/deals')}
                onFocus={() => handlePrefetchData('/deals')}
              >
                <AppSidebar.Item
                  href="/deals"
                  icon={<FileSpreadsheet size={18} />}
                  active={pathname === '/deals' && !currentStatusParam}
                  onClick={() => {
                    setMobileOpen(false);
                    setIsDealsSubmenuOpen(true);
                  }}
                  tooltipPlacement="right"
                  actions={
                    !collapsed ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDealsSubmenuOpen(!isDealsSubmenuOpen);
                        }}
                        className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/15 text-inherit transition flex items-center justify-center cursor-pointer"
                        title={isDealsSubmenuOpen ? 'Collapse status filters' : 'Expand status filters'}
                        aria-label="Toggle status filters"
                      >
                        {isDealsSubmenuOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    ) : undefined
                  }
                >
                  Deals Registry
                </AppSidebar.Item>
              </div>

              {/* Status Sub-items directly under Deals Registry (collapsible) */}
              {!collapsed && isDealsSubmenuOpen && (
                <div className="w-full pl-5 pr-2 py-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="border-l-2 border-border/60 pl-2.5 space-y-0.5">
                    {DEAL_STATUS_FILTERS.map((st) => {
                      const isStatusActive = pathname === '/deals' && currentStatusParam === st.id;
                      return (
                        <Link
                          key={st.id}
                          href={`/deals?status=${st.id}`}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition ${
                            isStatusActive
                              ? 'bg-primary/10 text-primary font-bold shadow-xs'
                              : 'text-muted hover:text-foreground hover:bg-neutral/50 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full ${st.color} shrink-0`} />
                            <span className="truncate">{st.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Reports */}
            <div
              className="w-full flex justify-center"
              onMouseEnter={() => handlePrefetchData('/reports')}
              onFocus={() => handlePrefetchData('/reports')}
            >
              <AppSidebar.Item
                href="/reports"
                icon={<BarChart2 size={18} />}
                active={pathname === '/reports'}
                onClick={() => setMobileOpen(false)}
                tooltipPlacement="right"
              >
                Reports
              </AppSidebar.Item>
            </div>

            {/* 4. Register Deal */}
            {!isViewOnly && (
              <div
                className="w-full flex justify-center"
              >
                <AppSidebar.Item
                  href="/deals/new"
                  icon={<PlusCircle size={18} />}
                  active={pathname === '/deals/new'}
                  onClick={() => setMobileOpen(false)}
                  tooltipPlacement="right"
                >
                  Register Deal
                </AppSidebar.Item>
              </div>
            )}
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
            onClick={async () => {
              setShowSignOutConfirm(false);
              await signOut({ callbackUrl: '/login' });
            }}
          >
            Sign Out
          </AppButton>
        </AppModal.Footer>
      </AppModal>
    </>
  );
}
