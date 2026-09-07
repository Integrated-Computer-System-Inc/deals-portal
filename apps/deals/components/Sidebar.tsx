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
  Users,
  Mail,
  ScrollText,
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
  { id: '1', label: 'Registered', color: 'bg-emerald-500', href: '/deals?status=1' },
  { id: 'expiring', label: 'Expiring', color: 'bg-amber-500', href: '/deals?expiry=expiring', isExpiry: true },
  { id: 'renewed', label: 'Renewed', color: 'bg-teal-500', href: '/deals?status=renewed' },
  { id: '4', label: 'Waiting', color: 'bg-sky-500', href: '/deals?status=4' },
  { id: '6', label: 'Won', color: 'bg-indigo-500', href: '/deals?status=6' },
  { id: '7', label: 'Lost', color: 'bg-rose-600', href: '/deals?status=7' },
  { id: '5', label: 'Expired', color: 'bg-zinc-400', href: '/deals?status=5' },
  { id: '2', label: 'Declined', color: 'bg-rose-500', href: '/deals?status=2' },
];

export default function Sidebar() {
  const pathname = usePathname() || '';
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatusParam = searchParams?.get('status') || '';
  const currentExpiryParam = searchParams?.get('expiry') || searchParams?.get('expiryFilter') || '';
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const [showSignOutConfirm, setShowSignOutConfirm] = React.useState(false);
  const { collapsed, toggleCollapsed, setMobileOpen, isMobile } = useSidebar();

  const isDealsRegistryPage = pathname === '/deals' || (pathname.startsWith('/deals/') && pathname !== '/deals/new');
  const [isDealsSubmenuOpen, setIsDealsSubmenuOpen] = React.useState(isDealsRegistryPage);

  // Sync open state when navigating across routes: auto-open on Deals page, auto-close on other pages
  React.useEffect(() => {
    setIsDealsSubmenuOpen(isDealsRegistryPage);
  }, [isDealsRegistryPage]);

  const userRole: UserRole = (session?.user as any)?.role || 'admin';
  const accountName = (session?.user as any)?.AccountName || (session?.user as any)?.name || '';
  const accountEmail = (session?.user as any)?.Email || session?.user?.email || '';
  const accountImage = (session?.user as any)?.GAvatar || session?.user?.image || undefined;
  const userBU = (session?.user as any)?.AccountGroup || 'HQ';

  const getRoleLabel = () => {
    if (userRole === 'ITadmin') return 'IT Administrator';
    if (userRole === 'admin') return 'Sales Administrator';
    if (userRole === 'pm') return 'Product Manager';
    if (userRole === 'aa') return 'Admin Assistant';
    if (userRole === 'bu' || userRole === 'bu_admin') {
      return userBU && userBU !== 'HQ' ? `BU Head (${userBU})` : 'BU Head';
    }
    return 'Account Officer';
  };

  const isViewOnly = status === 'authenticated' && (userRole === 'bu' || userRole === 'bu_admin' || userRole === 'ao' || userRole === 'pm');

  // Pre-load all main navigation route chunks in background on mount
  React.useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/deals');
    router.prefetch('/reports');
    if (userRole === 'ITadmin') {
      router.prefetch('/admin/users');
      router.prefetch('/admin/emails');
      router.prefetch('/admin/activity-logs');
    }
    if (!isViewOnly) {
      router.prefetch('/deals/new');
    }
  }, [router, isViewOnly, userRole]);

  return (
    <>
      <AppSidebar className="border-r border-border bg-sidebar flex flex-col h-screen shrink-0">
        {/* Brand Header */}
        <AppSidebar.Header className={collapsed ? "p-3 border-b border-border/50 shrink-0" : "p-3.5 border-b border-border/50 shrink-0"}>
          {collapsed ? (
            /* Collapsed Header: Centered Gary Mascot Logo & Centered Expand Button */
            <div id="tour-brand-header" className="flex flex-col items-center justify-center gap-2.5 w-full p-1 rounded-xl">
              <Tooltip title="DROMMAR" placement="right">
                <img
                  src="/api/icons/Sidebar_Logo.png"
                  alt="DROMMAR"
                  className="h-9 w-9 rounded-xl object-contain shadow-xs shrink-0 cursor-default select-none mx-auto"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/icons/Sidebar_Logo.png';
                  }}
                />
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
            <div id="tour-brand-header" className="flex items-center justify-between gap-2.5 w-full p-1 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src="/api/icons/Sidebar_Logo.png"
                  alt="DROMMAR"
                  className="h-9 w-9 rounded-xl object-contain shadow-xs shrink-0 select-none"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/icons/Sidebar_Logo.png';
                  }}
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm text-foreground tracking-tight leading-tight truncate">
                    DROMMAR
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
          <AppSidebar.Group id="tour-sidebar-nav" className="w-full flex flex-col items-center space-y-1">
            {!collapsed && (
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted w-full text-left">
                Menu
              </div>
            )}

            {/* 1. Home */}
            <div className="w-full flex justify-center">
              <AppSidebar.Item
                href="/dashboard"
                icon={<Home size={18} />}
                active={pathname === '/dashboard'}
                onClick={() => {
                  setMobileOpen(false);
                  setIsDealsSubmenuOpen(false);
                  try {
                    sessionStorage.removeItem('DEALS_NAVIGATED_TO_DETAIL');
                  } catch {}
                }}
                tooltipPlacement="right"
              >
                Home
              </AppSidebar.Item>
            </div>

            {/* 2. Deals Registry & Nested Status Filtering */}
            <div id="tour-deals-submenu" className="w-full flex flex-col items-center">
              <div className="w-full flex justify-center">
                <AppSidebar.Item
                  href="/deals"
                  icon={<FileSpreadsheet size={18} />}
                  active={pathname === '/deals' && !currentStatusParam && !currentExpiryParam}
                  onClick={() => {
                    setMobileOpen(false);
                    setIsDealsSubmenuOpen(true);
                    try {
                      sessionStorage.removeItem('DEALS_REGISTRY_VIEW_STATE');
                      sessionStorage.removeItem('DEALS_NAVIGATED_TO_DETAIL');
                    } catch {}
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
                      const isStatusActive =
                        st.id === 'expiring'
                          ? pathname === '/deals' && (currentStatusParam === 'expiring' || currentExpiryParam === 'expiring' || currentExpiryParam.includes('CRITICAL_3'))
                          : pathname === '/deals' && currentStatusParam === st.id && !currentExpiryParam;

                      return (
                        <Link
                          key={st.id}
                          href={st.href}
                          onClick={() => {
                            setMobileOpen(false);
                            try {
                              sessionStorage.removeItem('DEALS_NAVIGATED_TO_DETAIL');
                            } catch {}
                          }}
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
            <div className="w-full flex justify-center">
              <AppSidebar.Item
                href="/reports"
                icon={<BarChart2 size={18} />}
                active={pathname === '/reports'}
                onClick={() => {
                  setMobileOpen(false);
                  setIsDealsSubmenuOpen(false);
                  try {
                    sessionStorage.removeItem('DEALS_NAVIGATED_TO_DETAIL');
                  } catch {}
                }}
                tooltipPlacement="right"
              >
                Reports
              </AppSidebar.Item>
            </div>

            {/* 4. Register Deal */}
            {!isViewOnly && (
              <div id="tour-new-deal-btn" className="w-full flex justify-center">
                <AppSidebar.Item
                  href="/deals/new"
                  icon={<PlusCircle size={18} />}
                  active={pathname === '/deals/new'}
                  onClick={() => {
                    setMobileOpen(false);
                    setIsDealsSubmenuOpen(false);
                    try {
                      sessionStorage.removeItem('DEALS_NAVIGATED_TO_DETAIL');
                    } catch {}
                  }}
                  tooltipPlacement="right"
                >
                  Register Deal
                </AppSidebar.Item>
              </div>
            )}
          </AppSidebar.Group>

          {/* Admin Group (IT Admin Only) */}
          {userRole === 'ITadmin' && (
            <div className="w-full mt-3 pt-3 border-t border-border/50">
              <AppSidebar.Group className="w-full flex flex-col items-center space-y-1">
                {!collapsed && (
                  <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted w-full text-left">
                    Admin
                  </div>
                )}
                {/* 1. User Management */}
                <div className="w-full flex justify-center">
                  <AppSidebar.Item
                    href="/admin/users"
                    icon={<Users size={18} />}
                    active={pathname === '/admin/users' || pathname.startsWith('/admin/users/')}
                    onClick={() => {
                      setMobileOpen(false);
                      setIsDealsSubmenuOpen(false);
                      try {
                        sessionStorage.removeItem('DEALS_NAVIGATED_TO_DETAIL');
                      } catch {}
                    }}
                    tooltipPlacement="right"
                  >
                    User Management
                  </AppSidebar.Item>
                </div>

                {/* 2. Email Configuration */}
                <div className="w-full flex justify-center">
                  <AppSidebar.Item
                    href="/admin/emails"
                    icon={<Mail size={18} />}
                    active={pathname === '/admin/emails' || pathname.startsWith('/admin/emails/')}
                    onClick={() => {
                      setMobileOpen(false);
                      setIsDealsSubmenuOpen(false);
                      try {
                        sessionStorage.removeItem('DEALS_NAVIGATED_TO_DETAIL');
                      } catch {}
                    }}
                    tooltipPlacement="right"
                  >
                    Email Configuration
                  </AppSidebar.Item>
                </div>

                {/* 3. Activity Logs */}
                <div className="w-full flex justify-center">
                  <AppSidebar.Item
                    href="/admin/activity-logs"
                    icon={<ScrollText size={18} />}
                    active={pathname === '/admin/activity-logs' || pathname.startsWith('/admin/activity-logs/')}
                    onClick={() => {
                      setMobileOpen(false);
                      setIsDealsSubmenuOpen(false);
                      try {
                        sessionStorage.removeItem('DEALS_NAVIGATED_TO_DETAIL');
                      } catch {}
                    }}
                    tooltipPlacement="right"
                  >
                    Activity Logs
                  </AppSidebar.Item>
                </div>
              </AppSidebar.Group>

            </div>
          )}
        </AppSidebar.Content>

        {/* Sticky User Footer */}
        <AppSidebar.Footer className={collapsed ? "p-2.5 border-t border-border/50 bg-sidebar shrink-0 mt-auto flex flex-col items-center justify-center space-y-2" : "p-3 border-t border-border/50 bg-sidebar shrink-0 mt-auto space-y-2.5"}>
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
                <div id="tour-theme-switcher" className="flex items-center justify-center">
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
                    <span className="text-xs font-semibold text-foreground truncate" title={accountName || getRoleLabel()}>
                      {accountName || getRoleLabel()}
                    </span>
                    <span className="text-[10px] text-muted truncate">
                      {getRoleLabel()}
                    </span>
                  </div>
                </div>
              )}

              <div id="tour-theme-switcher" className="flex items-center gap-1 shrink-0">
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
