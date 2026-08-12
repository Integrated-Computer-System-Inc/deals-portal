'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ShieldCheck, UserCheck, Building2, Chrome, ArrowRight, Lock } from 'lucide-react';
import { UserRole } from '@my-app/types';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  const handleRoleSignIn = (role: UserRole, accountName: string) => {
    signIn('demo-credentials', {
      role,
      accountName,
      callbackUrl: '/dashboard',
    });
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-2xl text-white shadow-lg shadow-sky-500/30 mb-4">
            DP
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome Back</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Sign in to access your scoped Deal Registration Portal
          </p>
        </div>

        {/* Primary Google OAuth Button */}
        <button
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm py-3.5 px-4 rounded-2xl border border-slate-200 shadow-sm transition hover:shadow-md active:scale-[0.99]"
        >
          <Chrome className="w-5 h-5 text-sky-500" />
          <span>Sign in with Google OAuth</span>
        </button>

        <div className="relative my-6 flex items-center justify-center">
          <div className="border-t border-slate-200 w-full"></div>
          <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest absolute">
            Or Demo Role Login
          </span>
        </div>

        {/* Role Fast-Switcher Options */}
        <div className="space-y-3">
          <button
            onClick={() => handleRoleSignIn('admin', 'Sarah Jenkins')}
            className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-200 rounded-2xl transition group text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Admin Account</div>
                <div className="text-[11px] text-slate-500">Unrestricted system access</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={() => handleRoleSignIn('ao', 'Alex Rivera')}
            className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-sky-50/60 border border-slate-200 hover:border-sky-200 rounded-2xl transition group text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Account Officer (AO)</div>
                <div className="text-[11px] text-slate-500">View/Edit assigned deals only</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={() => handleRoleSignIn('bu_admin', 'David Chen')}
            className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-amber-50/60 border border-slate-200 hover:border-amber-200 rounded-2xl transition group text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Business Unit Admin</div>
                <div className="text-[11px] text-slate-500">Read-only view for BU deals</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <div className="mt-8 text-center text-[11px] text-slate-400 flex items-center justify-center space-x-1">
          <Lock className="w-3 h-3" />
          <span>Protected by Enterprise NextAuth SSO</span>
        </div>
      </div>
    </div>
  );
}
