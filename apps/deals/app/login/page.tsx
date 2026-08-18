'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import {
  ShieldAlert,
  ArrowRight,
  Loader2,
  Fingerprint,
  Lock,
  ShieldCheck,
  Building2,
  User,
  Layers,
  X,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Inter, Outfit } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const outfit = Outfit({ subsets: ['latin'] });

interface DemoRoleOption {
  type: 'admin' | 'bu' | 'ao' | 'aa';
  title: string;
  badge: string;
  badgeColor: string;
  identity: string;
  description: string;
  scope: string;
  icon: React.ReactNode;
  gradient: string;
}

const DEMO_ROLES: DemoRoleOption[] = [
  {
    type: 'admin',
    title: 'Administrator',
    badge: 'Full Access',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    identity: 'Administrator (HQ)',
    description: 'Unrestricted access across all 8,426+ deals, all BUs, status updates, and WTN alerts.',
    scope: 'All BUs & AOs • Full Read/Write • In-App Analytics',
    icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
    gradient: 'from-emerald-600/20 to-teal-600/10 hover:border-emerald-500/50',
  },
  {
    type: 'bu',
    title: 'BU Supervisor',
    badge: 'View Only (BU5)',
    badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    identity: 'BU Head (BU5)',
    description: 'Supervises all Account Officers and deals within Business Unit 5 (1,917 real deals). Strictly read-only.',
    scope: 'BU5 Scope • View Only Dashboard & Deals',
    icon: <Building2 className="w-5 h-5 text-sky-400" />,
    gradient: 'from-sky-600/20 to-indigo-600/10 hover:border-sky-500/50',
  },
  {
    type: 'ao',
    title: 'Account Officer',
    badge: 'View Only (AO)',
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    identity: 'CAMILLE KILAKIGA (BU5)',
    description: 'Personal pipeline visibility for assigned customer accounts (705 real deals). Strictly read-only.',
    scope: 'Assigned Deals Only • Read-Only View',
    icon: <User className="w-5 h-5 text-amber-400" />,
    gradient: 'from-amber-600/20 to-orange-600/10 hover:border-amber-500/50',
  },
  {
    type: 'aa',
    title: 'Sales AA',
    badge: 'Admin (No Export)',
    badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    identity: 'Sales AA (HQ)',
    description: 'Full administrative pipeline management and deal editing across all BUs, with data export restricted.',
    scope: 'All BUs & AOs • Full Read/Write • Export Disabled',
    icon: <Layers className="w-5 h-5 text-purple-400" />,
    gradient: 'from-purple-600/20 to-pink-600/10 hover:border-purple-500/50',
  },
];

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');
  const [isLoading, setIsLoading] = useState(false);
  const [activeDemoType, setActiveDemoType] = useState<string | null>(null);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (error === 'AccessDenied') {
      setErrorMsg('You are not authorized to access this portal.');
    } else if (error) {
      setErrorMsg('An error occurred during authentication.');
    }
  }, [error]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await signIn('google', { callbackUrl: '/dashboard' });
  };

  const handleDemoAccountLogin = async (type: 'admin' | 'bu' | 'ao' | 'aa') => {
    setActiveDemoType(type);
    setIsLoading(true);
    await signIn('demo-credentials', {
      accountType: type,
      callbackUrl: '/dashboard',
    });
  };

  return (
    <>
      <div className="relative z-10 w-full max-w-md p-8 overflow-hidden backdrop-blur-2xl bg-white/5 border border-white/10 rounded-[2rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        {/* Decorative gradient orb inside the card */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-[40px] -ml-10 -mb-10 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="p-4 mb-6 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl shadow-lg shadow-blue-500/20">
            <Fingerprint className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>

          <h1 className={`${outfit.className} text-3xl font-semibold text-white tracking-tight mb-2`}>
            Welcome Back
          </h1>
          <p className={`${inter.className} text-sm text-zinc-400 mb-8 text-center`}>
            Sign in to your account to continue to the Deal Registration Portal.
          </p>

          {errorMsg && (
            <div className="flex items-center w-full p-4 mb-6 text-sm text-red-200 border bg-red-950/40 border-red-900/50 rounded-xl backdrop-blur-md">
              <ShieldAlert className="w-5 h-5 mr-3 text-red-500 shrink-0" />
              <p>{errorMsg}</p>
            </div>
          )}

          <div className="w-full space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="group relative flex items-center justify-center w-full px-6 py-3.5 text-sm font-medium text-white transition-all duration-300 ease-out bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-500/0 via-white/5 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              
              {isLoading && !activeDemoType ? (
                <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  <ArrowRight className="w-4 h-4 ml-auto text-zinc-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </>
              )}
            </button>

            <button
              onClick={() => setIsDemoModalOpen(true)}
              disabled={isLoading}
              className="flex items-center justify-center w-full px-6 py-3 text-xs font-semibold text-zinc-300 hover:text-white transition-all bg-gradient-to-r from-blue-600/10 to-purple-600/10 hover:from-blue-600/20 hover:to-purple-600/20 border border-white/10 hover:border-white/25 rounded-xl shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-2 text-sky-400" />
              <span>Explore with Demo Accounts</span>
              <ArrowRight className="w-3.5 h-3.5 ml-auto text-zinc-400" />
            </button>
          </div>

          <div className="mt-8 text-center text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-zinc-400" />
            <span>Protected by Enterprise NextAuth SSO</span>
          </div>
        </div>
      </div>

      {/* Demo Accounts Selector Modal */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl p-6 sm:p-7 bg-zinc-950/95 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`${outfit.className} text-xl font-bold text-white`}>
                    Select a Demo Account
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Test the Deals Portal with pre-configured role permissions & live MSSQL data.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDemoModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Demo Roles Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
              {DEMO_ROLES.map((role) => {
                const isLoggingInThis = isLoading && activeDemoType === role.type;

                return (
                  <button
                    key={role.type}
                    onClick={() => handleDemoAccountLogin(role.type)}
                    disabled={isLoading}
                    className={`p-4 rounded-2xl text-left transition-all duration-200 border bg-gradient-to-br ${role.gradient} border-zinc-800/80 flex flex-col justify-between group disabled:opacity-50`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-700/50">
                          {role.icon}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${role.badgeColor}`}>
                          {role.badge}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-white group-hover:text-sky-300 transition">
                        {role.title}
                      </h3>
                      <div className="text-[11px] font-mono text-zinc-400 mt-0.5 font-medium">
                        {role.identity}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                        {role.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="truncate max-w-[170px]">{role.scope}</span>
                      {isLoggingInThis ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white shrink-0" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-zinc-800/60 text-center">
              <p className="text-[11px] text-zinc-500">
                Connected to Microsoft SQL Server (<span className="text-zinc-400 font-mono">DealsRegistrationDB</span>)
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex items-center justify-center min-h-screen bg-black overflow-hidden selection:bg-blue-500/30">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-zinc-500" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
