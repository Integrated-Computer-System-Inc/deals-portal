'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { UserRole } from '@my-app/types';
import {
  AdminUserRecord,
  CdbDirectoryUser,
  searchCdbDirectory,
  createUser,
  updateUser,
} from '@/app/actions/users';
import { AppModal, AppModalHeader, AppModalTitle, AppModalBody } from '@/components/ui/modal';
import { AppButton } from '@/components/ui/buttons';
import { AppAvatar } from '@/components/ui/avatar';
import { OFFICIAL_REGISTERED_BUS } from '@/lib/buUtils';
import { CANONICAL_PRESET_BRANDS } from '@/lib/brandUtils';
import {
  Search,
  ShieldCheck,
  Building,
  UserCheck,
  Mail,
  AlertCircle,
  CheckCircle2,
  X,
  UserPlus,
  Edit2,
  Users,
  Check,
} from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingUser?: AdminUserRecord | null;
}

const ROLE_OPTIONS: { role: UserRole; title: string; description: string; badgeColor: string }[] = [
  {
    role: 'ITadmin',
    title: 'IT Administrator (Superadmin)',
    description: 'Full portal management, user administration, and system impersonation tool.',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  },
  {
    role: 'admin',
    title: 'Sales Administrator',
    description: 'Global access to view, register, and manage deals across all business units.',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  {
    role: 'pm',
    title: 'Product Manager (PM)',
    description: 'View-only access scoped to assigned brands across all business units.',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  {
    role: 'aa',
    title: 'Admin Assistant',
    description: 'Global access to register and edit deals across all business units.',
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
  },
  {
    role: 'bu',
    title: 'BU Head (Supervisor)',
    description: 'View-only access scoped to selected business units.',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  {
    role: 'ao',
    title: 'Account Officer',
    description: 'View-only access scoped to assigned deals and registrations created by them.',
    badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
  },
];

export default function UserModal({ isOpen, onClose, onSuccess, editingUser }: UserModalProps) {
  const isEditMode = !!editingUser;

  // Directory Search State (Add Mode)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CdbDirectoryUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDirectoryUser, setSelectedDirectoryUser] = useState<CdbDirectoryUser | null>(null);

  // Form State
  const [selectedRole, setSelectedRole] = useState<UserRole>('ao');
  const [assignedBUs, setAssignedBUs] = useState<string[]>(['BU1']);
  const [assignedBrands, setAssignedBrands] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset or initialize state on modal open/edit change
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (editingUser) {
        setSelectedRole(editingUser.UserRole);
        setAssignedBUs(
          editingUser.AssignedBUs && editingUser.AssignedBUs.length > 0
            ? editingUser.AssignedBUs
            : ['BU1']
        );
        setAssignedBrands(editingUser.AssignedBrands || []);
        setSelectedDirectoryUser(null);
        setSearchQuery('');
        setSearchResults([]);
      } else {
        setSelectedRole('ao');
        setAssignedBUs(['BU1']);
        setAssignedBrands([]);
        setSelectedDirectoryUser(null);
        setSearchQuery('');
        setSearchResults([]);
      }
    }
  }, [isOpen, editingUser]);

  // Debounced search for cdbAccounts directory
  useEffect(() => {
    if (isEditMode || !isOpen) return;

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await searchCdbDirectory(trimmed);
        if (res.success) {
          setSearchResults(res.data);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isEditMode, isOpen]);

  const toggleBU = (bu: string) => {
    if (assignedBUs.includes(bu)) {
      if (assignedBUs.length > 1) {
        setAssignedBUs(assignedBUs.filter((b) => b !== bu));
      }
    } else {
      setAssignedBUs([...assignedBUs, bu]);
    }
  };

  const handleSelectAllBUs = () => {
    if (assignedBUs.length === OFFICIAL_REGISTERED_BUS.length) {
      setAssignedBUs(['BU1']);
    } else {
      setAssignedBUs([...OFFICIAL_REGISTERED_BUS]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isEditMode && !selectedDirectoryUser) {
      setErrorMessage('Please search and select an employee from the directory.');
      return;
    }

    const accountId = isEditMode ? editingUser!.AccountID : selectedDirectoryUser!.AccountID;

    startTransition(async () => {
      try {
        if (isEditMode) {
          const res = await updateUser({
            accountId,
            role: selectedRole,
            assignedBUs: selectedRole === 'bu' || selectedRole === 'ao' ? assignedBUs : undefined,
            assignedBrands: selectedRole === 'pm' ? assignedBrands : undefined,
          });

          if (!res.success) {
            setErrorMessage(res.error || 'Failed to update user.');
            return;
          }
        } else {
          const res = await createUser({
            accountId,
            role: selectedRole,
            assignedBUs: selectedRole === 'bu' || selectedRole === 'ao' ? assignedBUs : undefined,
            assignedBrands: selectedRole === 'pm' ? assignedBrands : undefined,
          });

          if (!res.success) {
            setErrorMessage(res.error || 'Failed to add user.');
            return;
          }
        }

        onSuccess();
        onClose();
      } catch (err: any) {
        setErrorMessage(err.message || 'An unexpected error occurred.');
      }
    });
  };

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      width={620}
    >
      <AppModalHeader>
        <AppModalTitle>
          <div className="flex items-center gap-2 text-foreground">
            {isEditMode ? <Edit2 className="text-primary" size={20} /> : <UserPlus className="text-primary" size={20} />}
            <span>{isEditMode ? 'Edit User Permissions' : 'Add User from Directory'}</span>
          </div>
        </AppModalTitle>
      </AppModalHeader>

      <AppModalBody>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-xl flex items-start gap-2.5 text-danger text-sm animate-in fade-in duration-200">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-danger/60 hover:text-danger p-0.5 rounded"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* 1. Directory Search Section (Add Mode Only) */}
          {!isEditMode && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
                Search Employee Directory (cdbAccounts) <span className="text-danger">*</span>
              </label>

              {!selectedDirectoryUser ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder=""
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-neutral/50 text-foreground text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                      autoFocus
                    />
                    {isSearching && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted animate-pulse">
                        Searching...
                      </div>
                    )}
                  </div>

                  {/* Search Results Dropdown / Card List */}
                  {searchResults.length > 0 && (
                    <div className="max-h-56 overflow-y-auto border border-border/70 rounded-xl bg-card divide-y divide-border/40 shadow-lg">
                      {searchResults.map((user) => (
                        <button
                          key={user.AccountID}
                          type="button"
                          disabled={user.alreadyRegistered}
                          onClick={() => {
                            setSelectedDirectoryUser(user);
                            setSearchQuery('');
                            setSearchResults([]);
                            if (user.AccountGroup && user.AccountGroup !== 'HQ') {
                              setAssignedBUs([user.AccountGroup]);
                            }
                          }}
                          className={`w-full p-3 text-left flex items-center justify-between transition ${
                            user.alreadyRegistered
                              ? 'opacity-50 bg-neutral/30 cursor-not-allowed'
                              : 'hover:bg-primary/5 active:bg-primary/10 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <AppAvatar src={user.GAvatar || undefined} name={user.AccountName} size={36} className="shrink-0" />
                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-foreground truncate">{user.AccountName}</div>
                              <div className="text-xs text-muted truncate flex items-center gap-2">
                                <span>{user.Email || 'No corporate email'}</span>
                                {user.DomainAccount && <span>• CORP\{user.DomainAccount}</span>}
                                {user.AccountGroup && <span>• {user.AccountGroup}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 pl-2">
                            {user.alreadyRegistered ? (
                              <span className="text-[11px] font-semibold text-muted bg-neutral px-2 py-0.5 rounded-md border border-border">
                                Already Added
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
                                Select
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
                    <div className="p-3 text-center text-xs text-muted bg-neutral/30 rounded-xl border border-border/50">
                      No active employees found matching &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              ) : (
                /* Selected Employee Card */
                <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-3 min-w-0">
                    <AppAvatar src={selectedDirectoryUser.GAvatar || undefined} name={selectedDirectoryUser.AccountName} size={42} className="shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground truncate">
                          {selectedDirectoryUser.AccountName}
                        </span>
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          ID: {selectedDirectoryUser.AccountID}
                        </span>
                      </div>
                      <div className="text-xs text-muted truncate flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail size={12} /> {selectedDirectoryUser.Email}
                        </span>
                        {selectedDirectoryUser.DomainAccount && (
                          <span>• CORP\{selectedDirectoryUser.DomainAccount}</span>
                        )}
                        {selectedDirectoryUser.AccountGroup && <span>• {selectedDirectoryUser.AccountGroup}</span>}
                      </div>
                    </div>
                  </div>

                  <AppButton
                    variant="neutral"
                    size="sm"
                    onClick={() => setSelectedDirectoryUser(null)}
                    className="text-muted hover:text-danger shrink-0 text-xs"
                  >
                    Change
                  </AppButton>
                </div>
              )}
            </div>
          )}

          {/* Edit Mode Header Info */}
          {isEditMode && editingUser && (
            <div className="p-3.5 bg-neutral/40 border border-border rounded-xl flex items-center gap-3">
              <AppAvatar src={editingUser.GAvatar || undefined} name={editingUser.AccountName} size={42} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground truncate">{editingUser.AccountName}</span>
                  <span className="text-[10px] font-bold bg-neutral text-muted px-1.5 py-0.5 rounded border border-border">
                    ID: {editingUser.AccountID}
                  </span>
                  {editingUser.isSuperadmin && (
                    <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">
                      IT Superadmin
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted truncate flex items-center gap-2 mt-0.5">
                  <span>{editingUser.Email}</span>
                  {editingUser.DomainAccount && <span>• CORP\{editingUser.DomainAccount}</span>}
                  {editingUser.DirectoryAccountGroup && <span>• {editingUser.DirectoryAccountGroup}</span>}
                </div>
              </div>
            </div>
          )}

          {/* 2. Role Selection */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
              Assign Portal Role <span className="text-danger">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ROLE_OPTIONS.map((item) => {
                const isSelected = selectedRole === item.role;
                return (
                  <div
                    key={item.role}
                    onClick={() => setSelectedRole(item.role)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary'
                        : 'bg-neutral/20 border-border hover:bg-neutral/40 hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-foreground">{item.title}</div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition shrink-0 mt-0.5 ${
                          isSelected ? 'border-primary bg-primary text-white' : 'border-muted/40'
                        }`}
                      >
                        {isSelected && <Check size={10} strokeWidth={3} />}
                      </div>
                    </div>
                    <p className="text-xs text-muted mt-1.5 leading-relaxed">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Business Unit Assignment (for BU Heads and Account Officers) */}
          {(selectedRole === 'bu' || selectedRole === 'ao') && (
            <div className="space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
                  Assigned Business Units (BUs) <span className="text-danger">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllBUs}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  {assignedBUs.length === OFFICIAL_REGISTERED_BUS.length ? 'Clear All' : 'Select All Official'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {OFFICIAL_REGISTERED_BUS.map((bu) => {
                  const isSelected = assignedBUs.includes(bu);
                  return (
                    <button
                      key={bu}
                      type="button"
                      onClick={() => toggleBU(bu)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-neutral/40 text-muted hover:text-foreground border-border hover:bg-neutral/70'
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                      <span>{bu}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted">
                {selectedRole === 'bu'
                  ? 'BU Heads can view all registered and active deals within their assigned Business Units.'
                  : 'Account Officers are primarily scoped to their assigned deals within their business unit.'}
              </p>
            </div>
          )}

          {/* 4. Product Brand Assignment (for Product Managers) */}
          {selectedRole === 'pm' && (
            <div className="space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
                  Assigned Product Brands <span className="text-amber-500 font-normal">({assignedBrands.length} selected)</span>
                </label>
                {assignedBrands.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAssignedBrands([])}
                    className="text-xs text-rose-500 hover:text-rose-600 font-semibold hover:underline"
                  >
                    Clear Brands
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 border border-border/60 rounded-xl bg-neutral/20">
                {CANONICAL_PRESET_BRANDS.map((brand) => {
                  const isSelected = assignedBrands.includes(brand);
                  return (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setAssignedBrands(assignedBrands.filter((b) => b !== brand));
                        } else {
                          setAssignedBrands([...assignedBrands, brand]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1 cursor-pointer select-none ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-neutral/40 text-muted hover:text-foreground border-border hover:bg-neutral/70'
                      }`}
                    >
                      {isSelected && <Check size={11} strokeWidth={3} />}
                      <span>{brand}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted">
                Product Managers can view and analyze deal registrations across all Business Units matching their assigned brands.
              </p>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
            <AppButton type="button" variant="neutral" onClick={onClose} disabled={isPending}>
              Cancel
            </AppButton>
            <AppButton
              type="submit"
              variant="primary"
              loading={isPending}
              disabled={!isEditMode && !selectedDirectoryUser}
            >
              {isEditMode ? 'Save Changes' : 'Add User'}
            </AppButton>
          </div>
        </form>
      </AppModalBody>
    </AppModal>
  );
}
