'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@my-app/types';
import {
  AdminUserRecord,
  getUsersList,
  deleteUser,
} from '@/app/actions/users';
import UserModal from '@/components/admin/UserModal';
import BrandAssignmentModal from '@/components/admin/BrandAssignmentModal';
import BuTaggingModal from '@/components/admin/BuTaggingModal';
import { AppAvatar } from '@/components/ui/avatar';
import { AppButton } from '@/components/ui/buttons';
import { AppCard } from '@/components/ui/cards';
import { AppModal, AppModalHeader, AppModalTitle, AppModalBody } from '@/components/ui/modal';
import { Tooltip } from 'antd';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Building,
  UserCheck,
  Briefcase,
  AlertTriangle,
  Clock,
  X,
  Filter,
  Lock,
  ArrowUpDown,
  Tag,
  Sparkles,
} from 'lucide-react';
import { OFFICIAL_REGISTERED_BUS } from '@/lib/buUtils';

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const currentUserRole = (session?.user as any)?.role as UserRole | undefined;
  const currentUserId = Number((session?.user as any)?.AccountID);
  const currentUserEmail = (session?.user as any)?.Email || session?.user?.email;

  // Data & Loading States
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedBuFilter, setSelectedBuFilter] = useState<string>('all');

  // Modal States
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);
  const [brandAssignmentUser, setBrandAssignmentUser] = useState<AdminUserRecord | null>(null);
  const [buTaggingUser, setBuTaggingUser] = useState<AdminUserRecord | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUserRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch users from server action
  const loadUsers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getUsersList();
      if (res.success) {
        setUsers(res.data);
      } else {
        setErrorMessage(res.error || 'Failed to load users');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while fetching users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && currentUserRole === 'ITadmin') {
      loadUsers();
    } else if (status === 'authenticated' && currentUserRole !== 'ITadmin') {
      setIsLoading(false);
    }
  }, [status, currentUserRole]);

  // Handle User Deletion
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteUser(userToDelete.AccountID);
      if (res.success) {
        setUserToDelete(null);
        await loadUsers();
      } else {
        setErrorMessage(res.error || 'Failed to delete user');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while deleting user');
    } finally {
      setIsDeleting(false);
    }
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = users.length;
    const itAdmins = users.filter((u) => u.UserRole === 'ITadmin').length;
    const salesAdmins = users.filter((u) => u.UserRole === 'admin').length;
    const adminAssistants = users.filter((u) => u.UserRole === 'aa').length;
    const pms = users.filter((u) => u.UserRole === 'pm').length;
    const buHeads = users.filter((u) => u.UserRole === 'bu').length;
    const aos = users.filter((u) => u.UserRole === 'ao').length;
    return { total, itAdmins, salesAdmins, adminAssistants, pms, buHeads, aos };
  }, [users]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = u.AccountName.toLowerCase().includes(q);
        const matchesEmail = u.Email.toLowerCase().includes(q);
        const matchesDomain = (u.DomainAccount || '').toLowerCase().includes(q);
        const matchesId = String(u.AccountID).includes(q);
        const matchesBrands = (u.AssignedBrands || []).some((b) => b.toLowerCase().includes(q));
        const matchesBUs = (u.AssignedBUs || []).some((b) => b.toLowerCase().includes(q));
        if (!matchesName && !matchesEmail && !matchesDomain && !matchesId && !matchesBrands && !matchesBUs) {
          return false;
        }
      }

      // Role filter
      if (selectedRoleFilter !== 'all' && u.UserRole !== selectedRoleFilter) {
        return false;
      }

      // BU filter: Check which users have access to a specific BU unit
      if (selectedBuFilter !== 'all') {
        const filterUpper = selectedBuFilter.toUpperCase();
        if (u.UserRole === 'ITadmin' || u.UserRole === 'admin' || u.UserRole === 'aa') {
          // Global roles have access across all BUs
          return true;
        }
        const hasAssignedBU = u.AssignedBUs.some((b) => b.toUpperCase() === filterUpper);
        const hasDirectoryBU = (u.DirectoryAccountGroup || '')
          .split(',')
          .map((b) => b.trim().toUpperCase())
          .includes(filterUpper);

        if (!hasAssignedBU && !hasDirectoryBU) return false;
      }

      return true;
    });
  }, [users, searchQuery, selectedRoleFilter, selectedBuFilter]);

  // Render Access Denied state for non-ITadmin users
  if (status === 'authenticated' && currentUserRole !== 'ITadmin') {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <AppCard className="p-8 border-danger/30 bg-danger/5 text-center space-y-4 rounded-2xl">
          <div className="w-14 h-14 bg-danger/10 text-danger rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
            <p className="text-sm text-muted max-w-md mx-auto">
              User Management and portal privilege administration are restricted exclusively to IT Administrators.
            </p>
          </div>
          <div className="pt-2">
            <AppButton variant="primary" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </AppButton>
          </div>
        </AppCard>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Users size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                User Management
              </h1>
              <p className="text-xs sm:text-sm text-muted">
                Manage portal roles, granular brand tagging for PMs, and BU supervisory assignments.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <AppButton
            variant="neutral"
            size="sm"
            onClick={loadUsers}
            disabled={isLoading}
            leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
          >
            Refresh
          </AppButton>

          <AppButton
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingUser(null);
              setIsUserModalOpen(true);
            }}
            leftIcon={<UserPlus size={14} />}
          >
            Add Portal User
          </AppButton>
        </div>
      </div>

      {/* Metrics Row - Interactive Quick Filter Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => setSelectedRoleFilter('all')}
          className={`p-3 text-left bg-card border rounded-2xl flex items-center gap-2.5 shadow-xs transition cursor-pointer ${
            selectedRoleFilter === 'all'
              ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
              : 'border-border/70 hover:border-border'
          }`}
        >
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Users size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-extrabold text-foreground">{metrics.total}</div>
            <div className="text-[11px] text-muted font-medium truncate">Total Users</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRoleFilter(selectedRoleFilter === 'ITadmin' ? 'all' : 'ITadmin')}
          className={`p-3 text-left bg-card border rounded-2xl flex items-center gap-2.5 shadow-xs transition cursor-pointer ${
            selectedRoleFilter === 'ITadmin'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/5'
              : 'border-border/70 hover:border-border'
          }`}
        >
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
            <ShieldCheck size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-extrabold text-foreground">{metrics.itAdmins}</div>
            <div className="text-[11px] text-muted font-medium truncate">IT Admins</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRoleFilter(selectedRoleFilter === 'admin' ? 'all' : 'admin')}
          className={`p-3 text-left bg-card border rounded-2xl flex items-center gap-2.5 shadow-xs transition cursor-pointer ${
            selectedRoleFilter === 'admin'
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/5'
              : 'border-border/70 hover:border-border'
          }`}
        >
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
            <ShieldCheck size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-extrabold text-foreground">{metrics.salesAdmins}</div>
            <div className="text-[11px] text-muted font-medium truncate">Sales Admins</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRoleFilter(selectedRoleFilter === 'aa' ? 'all' : 'aa')}
          className={`p-3 text-left bg-card border rounded-2xl flex items-center gap-2.5 shadow-xs transition cursor-pointer ${
            selectedRoleFilter === 'aa'
              ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/5'
              : 'border-border/70 hover:border-border'
          }`}
        >
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
            <Briefcase size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-extrabold text-foreground">{metrics.adminAssistants}</div>
            <div className="text-[11px] text-muted font-medium truncate">Admin Asst</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRoleFilter(selectedRoleFilter === 'pm' ? 'all' : 'pm')}
          className={`p-3 text-left bg-card border rounded-2xl flex items-center gap-2.5 shadow-xs transition cursor-pointer ${
            selectedRoleFilter === 'pm'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5'
              : 'border-border/70 hover:border-border'
          }`}
        >
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <Tag size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-extrabold text-foreground">{metrics.pms}</div>
            <div className="text-[11px] text-muted font-medium truncate">Product Mgrs</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRoleFilter(selectedRoleFilter === 'bu' ? 'all' : 'bu')}
          className={`p-3 text-left bg-card border rounded-2xl flex items-center gap-2.5 shadow-xs transition cursor-pointer ${
            selectedRoleFilter === 'bu'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5'
              : 'border-border/70 hover:border-border'
          }`}
        >
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Building size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-extrabold text-foreground">{metrics.buHeads}</div>
            <div className="text-[11px] text-muted font-medium truncate">BU Heads</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRoleFilter(selectedRoleFilter === 'ao' ? 'all' : 'ao')}
          className={`p-3 text-left bg-card border rounded-2xl flex items-center gap-2.5 shadow-xs transition cursor-pointer ${
            selectedRoleFilter === 'ao'
              ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-500/5'
              : 'border-border/70 hover:border-border'
          }`}
        >
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
            <UserCheck size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-extrabold text-foreground">{metrics.aos}</div>
            <div className="text-[11px] text-muted font-medium truncate">Account Officers</div>
          </div>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <AppCard className="p-3.5 bg-card border-border/70 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder=""
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-white dark:bg-neutral/30 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-muted font-semibold">
              <Filter size={14} />
              <span>Role:</span>
            </div>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-border/80 bg-neutral/30 text-foreground text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="ITadmin">IT Administrators</option>
              <option value="admin">Sales Administrators</option>
              <option value="pm">Product Managers (PM)</option>
              <option value="aa">Admin Assistants</option>
              <option value="bu">BU Heads</option>
              <option value="ao">Account Officers</option>
            </select>
          </div>

          {/* BU Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-xs text-muted font-semibold">BU:</div>
            <select
              value={selectedBuFilter}
              onChange={(e) => setSelectedBuFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-border/80 bg-neutral/30 text-foreground text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="all">All Business Units</option>
              {OFFICIAL_REGISTERED_BUS.map((bu) => (
                <option key={bu} value={bu}>
                  {bu}
                </option>
              ))}
            </select>
          </div>
        </div>
      </AppCard>

      {/* Main Table */}
      <AppCard className="overflow-hidden border-border/70 rounded-2xl shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="animate-spin text-primary mx-auto" size={28} />
            <div className="text-sm font-medium text-muted">Loading registered portal users...</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-neutral/50 text-muted rounded-2xl flex items-center justify-center mx-auto">
              <Users size={24} />
            </div>
            <div className="space-y-1">
              <div className="font-bold text-base text-foreground">No users found</div>
              <p className="text-xs text-muted">
                {searchQuery || selectedRoleFilter !== 'all' || selectedBuFilter !== 'all'
                  ? 'No users match your current search and filter criteria.'
                  : 'No users have been registered in the portal yet.'}
              </p>
            </div>
            {(searchQuery || selectedRoleFilter !== 'all' || selectedBuFilter !== 'all') && (
              <AppButton
                variant="neutral"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRoleFilter('all');
                  setSelectedBuFilter('all');
                }}
              >
                Clear Filters
              </AppButton>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral/40 border-b border-border/70 text-muted uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Employee Name</th>
                  <th className="py-3.5 px-4">Corporate Email</th>
                  <th className="py-3.5 px-4">Assigned Role</th>
                  <th className="py-3.5 px-4">Scope (Brands / BUs)</th>
                  <th className="py-3.5 px-4">Directory Status</th>
                  <th className="py-3.5 px-4">Last Login</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                {filteredUsers.map((user) => {
                  const isSelf = currentUserId === user.AccountID || currentUserEmail?.toLowerCase() === user.Email.toLowerCase();

                  return (
                    <tr
                      key={user.AccountID}
                      className="hover:bg-primary/[0.02] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <AppAvatar src={user.GAvatar || undefined} name={user.AccountName} size={36} className="shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground truncate max-w-[200px]">
                                {user.AccountName}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
                              <span>ID: {user.AccountID}</span>
                              {user.DomainAccount && <span>• CORP\{user.DomainAccount}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-foreground/90 font-normal">{user.Email}</span>
                      </td>

                      <td className="py-3 px-4">
                        {user.UserRole === 'ITadmin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            <ShieldCheck size={12} /> IT Administrator
                          </span>
                        ) : user.UserRole === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <ShieldCheck size={12} /> Sales Administrator
                          </span>
                        ) : user.UserRole === 'pm' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Tag size={12} /> Product Manager
                          </span>
                        ) : user.UserRole === 'aa' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            <Briefcase size={12} /> Admin Assistant
                          </span>
                        ) : user.UserRole === 'bu' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <Building size={12} /> BU Head
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                            <UserCheck size={12} /> Account Officer
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {user.UserRole === 'pm' ? (
                          user.AssignedBrands && user.AssignedBrands.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[280px]">
                              {user.AssignedBrands.map((brand) => (
                                <span
                                  key={brand}
                                  className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                                >
                                  {brand}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 text-[11px] font-semibold italic">
                              No brands assigned yet
                            </span>
                          )
                        ) : user.UserRole === 'ITadmin' || user.UserRole === 'admin' ? (
                          <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-neutral/60 text-muted border border-border">
                            ALL BUs & Brands
                          </span>
                        ) : user.AssignedBUs && user.AssignedBUs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.AssignedBUs.map((bu) => (
                              <span
                                key={bu}
                                className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20"
                              >
                                {bu}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted text-[11px] font-normal italic">
                            Default Access
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {user.DirectoryIsActive === 1 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Inactive
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {user.LastLogin ? (
                          <div className="text-[11px] text-foreground/80 flex items-center gap-1">
                            <Clock size={12} className="text-muted" />
                            <span>{new Date(user.LastLogin).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted italic">Never</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {user.UserRole === 'pm' && (
                            <Tooltip title="Assign & Manage Brands">
                              <div>
                                <AppButton
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setBrandAssignmentUser(user)}
                                  className="h-7 w-7 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                                >
                                  <Tag size={14} />
                                </AppButton>
                              </div>
                            </Tooltip>
                          )}
                          {(user.UserRole === 'bu' || user.UserRole === 'ao') && (
                            <Tooltip title="Tag Business Units (BUs)">
                              <div>
                                <AppButton
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setBuTaggingUser(user)}
                                  className="h-7 w-7 text-primary hover:bg-primary/10"
                                >
                                  <Building size={14} />
                                </AppButton>
                              </div>
                            </Tooltip>
                          )}
                          <Tooltip title="Edit Role & Permissions">
                            <div>
                              <AppButton
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingUser(user);
                                  setIsUserModalOpen(true);
                                }}
                                className="h-7 w-7 text-muted hover:text-foreground hover:bg-neutral"
                              >
                                <Edit2 size={14} />
                              </AppButton>
                            </div>
                          </Tooltip>
                          <Tooltip title={isSelf ? 'You cannot delete your own active account' : 'Revoke Access & Delete User'}>
                            <div>
                              <AppButton
                                variant="ghost"
                                size="icon"
                                disabled={isSelf}
                                onClick={() => setUserToDelete(user)}
                                className={`h-7 w-7 ${
                                  isSelf
                                    ? 'text-muted/30 cursor-not-allowed'
                                    : 'text-muted hover:text-danger hover:bg-danger/10'
                                }`}
                              >
                                <Trash2 size={14} />
                              </AppButton>
                            </div>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AppCard>

      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setEditingUser(null);
        }}
        onSuccess={loadUsers}
        editingUser={editingUser}
      />

      <BrandAssignmentModal
        isOpen={!!brandAssignmentUser}
        onClose={() => setBrandAssignmentUser(null)}
        onSuccess={loadUsers}
        user={brandAssignmentUser}
      />

      <BuTaggingModal
        isOpen={!!buTaggingUser}
        onClose={() => setBuTaggingUser(null)}
        onSuccess={loadUsers}
        user={buTaggingUser}
      />

      <AppModal
        open={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        width={440}
      >
        <AppModalHeader>
          <AppModalTitle>
            <div className="flex items-center gap-2 text-danger">
              <AlertTriangle size={20} />
              <span>Revoke Portal Access</span>
            </div>
          </AppModalTitle>
        </AppModalHeader>

        <AppModalBody>
          {userToDelete && (
            <div className="space-y-4">
              <p className="text-sm text-foreground leading-relaxed">
                Are you sure you want to remove <strong className="text-foreground font-bold">{userToDelete.AccountName}</strong> ({userToDelete.Email}) from portal users?
              </p>
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger leading-relaxed">
                <strong>Warning:</strong> This will immediately revoke their ability to access and log in to the Deal Registration Portal.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                <AppButton variant="neutral" onClick={() => setUserToDelete(null)} disabled={isDeleting}>
                  Cancel
                </AppButton>
                <AppButton
                  variant="danger"
                  onClick={handleDeleteUser}
                  loading={isDeleting}
                >
                  Yes, Revoke Access
                </AppButton>
              </div>
            </div>
          )}
        </AppModalBody>
      </AppModal>
    </div>
  );
}
