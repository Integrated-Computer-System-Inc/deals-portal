'use client';

import React, { useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { IMPERSONATION_PERSONAS, ImpersonationPersona } from '@/lib/roles';
import { switchImpersonationTarget } from '@/app/actions/impersonation';
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
} from 'lucide-react';

export const ImpersonationBanner: React.FC = () => {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const u = session?.user as any;
  const isImpersonating = Boolean(u?.isImpersonating);
  const originalAdminEmail = u?.originalAdminEmail || (u?.email === 'jdoremon@ics.com.ph' ? u?.email : null);
  const isSuperadmin = u?.email === 'jdoremon@ics.com.ph' || Boolean(originalAdminEmail);

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
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500 text-white font-medium hover:bg-amber-600 transition shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Impersonate Role / BU Head</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-1 w-80 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2 py-1 uppercase tracking-wider">
                Select Persona to Impersonate
              </div>
              <div className="space-y-1 max-h-80 overflow-y-auto mt-1">
                {IMPERSONATION_PERSONAS.map((p) => (
                  <button
                    key={p.accountId}
                    onClick={() => handleSwitch(p)}
                    className="w-full text-left px-2.5 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-start gap-2 text-xs"
                  >
                    <div className="mt-0.5">
                      {p.category === 'ADMIN' && <Shield className="w-3.5 h-3.5 text-indigo-500" />}
                      {p.category === 'BU_HEAD' && <Building className="w-3.5 h-3.5 text-purple-500" />}
                      {p.category === 'ACCOUNT_OFFICER' && <User className="w-3.5 h-3.5 text-emerald-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {p.roleTitle} {p.assignedBUs.length > 0 && `• ${p.assignedBUs.join(', ')}`}
                      </div>
                      {p.dealCountDescription && (
                        <div className="text-[9px] text-amber-600 dark:text-amber-400 font-mono">
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
            {currentRole === 'ao' ? 'Account Officer' : currentRole === 'bu' ? 'BU Head' : currentRole === 'aa' ? 'Admin Assistant' : 'Admin'}
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
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/20 hover:bg-white/30 transition text-xs font-semibold backdrop-blur-sm shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Switch Role</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-1 w-80 bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 text-slate-800 dark:text-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2 py-1 uppercase tracking-wider">
                Switch Impersonation Target
              </div>
              <div className="space-y-1 max-h-80 overflow-y-auto mt-1">
                {IMPERSONATION_PERSONAS.map((p) => {
                  const isCurrent = p.accountId === currentAccountId;
                  return (
                    <button
                      key={p.accountId}
                      onClick={() => handleSwitch(p)}
                      disabled={isCurrent}
                      className={`w-full text-left px-2.5 py-2 rounded-md transition flex items-start gap-2 text-xs ${
                        isCurrent
                          ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/50'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isCurrent ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                        ) : p.category === 'ADMIN' ? (
                          <Shield className="w-3.5 h-3.5 text-indigo-500" />
                        ) : p.category === 'BU_HEAD' ? (
                          <Building className="w-3.5 h-3.5 text-purple-500" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center justify-between">
                          <span>{p.name}</span>
                          {isCurrent && <span className="text-[9px] text-amber-600 font-bold uppercase">Active</span>}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {p.roleTitle} {p.assignedBUs.length > 0 && `• ${p.assignedBUs.join(', ')}`}
                        </div>
                        {p.dealCountDescription && (
                          <div className="text-[9px] text-amber-600 dark:text-amber-400 font-mono">
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
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-black/40 hover:bg-black/60 transition text-xs font-semibold text-white shadow-sm border border-white/20"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit Impersonation</span>
        </button>
      </div>
    </div>
  );
};
