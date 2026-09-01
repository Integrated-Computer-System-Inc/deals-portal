'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { ImpersonationPersona, isSuperadminEmail } from '@/lib/roles';
import { getAvailablePersonas, switchImpersonationTarget } from '@/app/actions/impersonation';
import { AppAvatar } from './ui/avatar';
import { useRouter } from 'next/navigation';
import {
  UserCheck,
  LogOut,
  Shield,
  Building,
  User,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  ArrowRightLeft,
  Tag,
  Briefcase,
  RefreshCw,
} from 'lucide-react';

export const ImpersonationBanner: React.FC = () => {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [personas, setPersonas] = useState<ImpersonationPersona[]>([]);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(false);

  const u = session?.user as any;
  const isImpersonating = Boolean(u?.isImpersonating);
  const originalAdminEmail = u?.originalAdminEmail || (isSuperadminEmail(u?.email) ? u?.email : null);
  const isSuperadmin = isSuperadminEmail(u?.email) || Boolean(originalAdminEmail) || u?.role === 'ITadmin';

  // Fetch dynamic personas on mount or open
  useEffect(() => {
    if (isSuperadmin || isImpersonating) {
      setIsLoadingPersonas(true);
      getAvailablePersonas()
        .then((res) => {
          if (res.success && res.data) {
            setPersonas(res.data);
          }
        })
        .catch((err) => console.error('Failed to load dynamic personas:', err))
        .finally(() => setIsLoadingPersonas(false));
    }
  }, [isSuperadmin, isImpersonating]);

  // If not superadmin and not impersonating, do not render anything
  if (!isSuperadmin && !isImpersonating) {
    return null;
  }

  const currentAccountId = Number(u?.AccountID);
  const currentRole = u?.role || 'admin';
  const currentName = u?.AccountName || u?.name || 'User';
  const currentBUs = (u?.assignedBUs as string[]) || [];

  const handleSwitch = async (target: ImpersonationPersona | null) => {
    setIsOpen(false);
    startTransition(async () => {
      try {
        const res = await switchImpersonationTarget(target ? target.accountId : null);
        if (res.success) {
          await update({ impersonateTarget: res.target });
          router.refresh();
        } else {
          console.error('Failed to switch impersonation:', res.error);
        }
      } catch (err) {
        console.error('Error switching impersonation:', err);
      }
    });
  };

  // If superadmin not yet impersonating, show a subtle dev toggle badge in top bar
  if (!isImpersonating) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="font-semibold uppercase tracking-wider text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded">
            Superadmin Mode
          </span>
          <span>Logged in as <strong>{u?.email}</strong> (Full IT System Admin)</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            disabled={isPending}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500 text-white font-medium hover:bg-amber-600 transition shadow-sm cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Impersonate Portal User</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-1 w-88 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2.5 py-1.5 uppercase tracking-wider flex items-center justify-between">
                <span>Select User to Impersonate</span>
                {isLoadingPersonas && <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />}
              </div>
              <div className="space-y-1 max-h-80 overflow-y-auto mt-1 pr-1">
                {personas.map((p) => (
                  <button
                    key={p.accountId}
                    onClick={() => handleSwitch(p)}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-2.5 text-xs cursor-pointer"
                  >
                    <AppAvatar src={p.GAvatar || undefined} name={p.name} size={30} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {p.roleTitle} {p.assignedBUs && p.assignedBUs.length > 0 && p.assignedBUs[0] !== 'ALL' && `• ${p.assignedBUs.join(', ')}`}
                      </div>
                      {p.dealCountDescription && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate">
                          {p.dealCountDescription}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active Impersonation Sticky Banner
  return (
    <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2 shadow-md flex items-center justify-between z-50 sticky top-0 text-xs">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-black/20 px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
          <span>Impersonating Persona</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-yellow-100">{currentName}</span>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-medium backdrop-blur-sm">
            {currentRole === 'ao'
              ? 'Account Officer'
              : currentRole === 'bu'
              ? 'BU Head'
              : currentRole === 'pm'
              ? 'Product Manager'
              : currentRole === 'aa'
              ? 'Admin Assistant'
              : currentRole === 'ITadmin'
              ? 'IT Administrator'
              : 'Sales Administrator'}
          </span>
          {currentBUs.length > 0 && (
            <span className="bg-black/30 px-2 py-0.5 rounded text-[10px] font-mono">
              {currentBUs.join(', ')}
            </span>
          )}
        </div>

        <span className="hidden md:inline text-white/75 text-[11px]">
          (Original Superadmin: <strong>{originalAdminEmail}</strong>)
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Switch to another persona dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/20 hover:bg-white/30 transition text-xs font-semibold backdrop-blur-sm shadow-sm cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Switch Role</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-1 w-88 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 text-slate-800 dark:text-slate-200">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2.5 py-1.5 uppercase tracking-wider flex items-center justify-between">
                <span>Switch Impersonation Target</span>
                {isLoadingPersonas && <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />}
              </div>
              <div className="space-y-1 max-h-80 overflow-y-auto mt-1 pr-1">
                {personas.map((p) => {
                  const isCurrent = p.accountId === currentAccountId;
                  return (
                    <button
                      key={p.accountId}
                      onClick={() => handleSwitch(p)}
                      disabled={isCurrent}
                      className={`w-full text-left p-2 rounded-lg transition flex items-center gap-2.5 text-xs ${
                        isCurrent
                          ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/50 cursor-default'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                      }`}
                    >
                      <AppAvatar src={p.GAvatar || undefined} name={p.name} size={30} className="shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate flex items-center justify-between">
                          <span>{p.name}</span>
                          {isCurrent && <span className="text-[9px] text-amber-600 font-bold uppercase">Active</span>}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {p.roleTitle} {p.assignedBUs && p.assignedBUs.length > 0 && p.assignedBUs[0] !== 'ALL' && `• ${p.assignedBUs.join(', ')}`}
                        </div>
                        {p.dealCountDescription && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate">
                            {p.dealCountDescription}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Exit Impersonation Button */}
        <button
          onClick={() => handleSwitch(null)}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-black/40 hover:bg-black/60 transition text-xs font-semibold text-white shadow-sm border border-white/20 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit Impersonation</span>
        </button>
      </div>
    </div>
  );
};
