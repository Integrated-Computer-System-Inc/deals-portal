'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
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
  Check,
  CircleSlash,
  Database,
  Info,
} from 'lucide-react';
import { Inter, Outfit } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const outfit = Outfit({ subsets: ['latin'] });

// ---------------------------------------------------------------------------
// Authentication error mapping
// Covers every error code NextAuth can surface via /login?error=<code>,
// including AccessDenied returned by the corporate directory check in
// lib/auth.ts (signIn callback -> liveSearch validation).
// ---------------------------------------------------------------------------

interface AuthErrorInfo {
  title: string;
  description: string;
}

const AUTH_ERROR_MESSAGES: Record<string, AuthErrorInfo> = {
  AccessDenied: {
    title: 'Access denied',
    description:
      'Your Google account was not found in the ICS corporate directory, so you do not have permission to sign in to the Deals Portal. Contact the Sales Admin team to request access.',
  },
  OAuthAccountNotLinked: {
    title: 'Account already linked',
    description:
      'This email is already linked to a different sign-in method. Try signing in using the original method instead.',
  },
  OAuthCallback: {
    title: 'Sign-in could not be completed',
    description:
      'The Google sign-in flow was interrupted or expired. Please try again in a moment.',
  },
  OAuthCallbackError: {
    title: 'Sign-in could not be completed',
    description:
      'Google returned an error during the sign-in flow. Please try again in a moment.',
  },
  OAuthSignin: {
    title: 'Sign-in could not start',
    description:
      'We could not start the Google sign-in flow. Check your connection and try again.',
  },
  Configuration: {
    title: 'Authentication service misconfigured',
    description:
      'There is a server-side configuration problem with the authentication provider. Please contact IT support.',
  },
  CredentialsSignin: {
    title: 'Demo session failed',
    description: 'The demo account session could not be created. Please try again.',
  },
  SessionRequired: {
    title: 'Session required',
    description: 'You need to be signed in to view that page. Please sign in to continue.',
  },
  Default: {
    title: 'Authentication error',
    description: 'An unexpected error occurred during sign-in. Please try again.',
  },
};

function resolveAuthError(code: string | null): AuthErrorInfo | null {
  if (!code) return null;
  return AUTH_ERROR_MESSAGES[code] ?? AUTH_ERROR_MESSAGES.Default;
}

// ---------------------------------------------------------------------------
// Demo account catalogue
// Roles, scopes and permission levels mirror the RBAC rules enforced by the
// backend (see BACKEND_ARCHITECTURE.md §5 Security, Scoping & RBAC).
// Raw data exports are disabled for every role by design.
// ---------------------------------------------------------------------------

type DemoRoleType = 'admin' | 'aa' | 'bu' | 'ao';

interface DemoRoleOption {
  type: DemoRoleType;
  title: string;
  badge: string;
  badgeColor: string;
  headerGradient: string;
  iconColor: string;
  identity: string;
  description: string;
  permissions: string[];
  dataScope: string;
  canWrite: boolean;
  icon: React.ReactNode;
}

const DEMO_ROLES: DemoRoleOption[] = [
  {
    type: 'admin',
    title: 'Sales Admin',
    badge: 'Full Access',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    headerGradient: 'from-emerald-100 to-teal-50',
    iconColor: 'text-emerald-600',
    identity: 'Administrator (HQ)',
    description:
      'Complete organization-wide visibility with unrestricted deal management, status updates, and WTN alerts.',
    permissions: ['Manage all deals across every BU', 'Update statuses, WTN timers & analytics'],
    dataScope: 'All BUs & AOs • 8,426+ deals',
    canWrite: true,
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  {
    type: 'aa',
    title: 'Sales AA',
    badge: 'Read/Write (No Export)',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
    headerGradient: 'from-purple-100 to-pink-50',
    iconColor: 'text-purple-600',
    identity: 'Sales AA (HQ)',
    description:
      'Global read/write pipeline management and deal editing across all BUs, with data export disabled.',
    permissions: ['Create & edit deals across all BUs', 'Export endpoints disabled for protection'],
    dataScope: 'All BUs & AOs • Full Read/Write',
    canWrite: true,
    icon: <Layers className="w-5 h-5" />,
  },
  {
    type: 'bu',
    title: 'BU Supervisor',
    badge: 'View Only (BU5)',
    badgeColor: 'bg-sky-100 text-sky-700 border-sky-200',
    headerGradient: 'from-sky-100 to-indigo-50',
    iconColor: 'text-sky-600',
    identity: 'BU Head (BU5)',
    description:
      'Supervises all Account Officers and deals within Business Unit 5. Strictly read-only.',
    permissions: ['Oversee every AO and deal inside BU5', 'Read-only — no edits or mutations'],
    dataScope: 'BU5 only • 1,917 deals',
    canWrite: false,
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    type: 'ao',
    title: 'Account Officer',
    badge: 'View Only (AO)',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
    headerGradient: 'from-amber-100 to-orange-50',
    iconColor: 'text-amber-600',
    identity: 'CAMILLE KILAKIGA (BU5)',
    description:
      'Personal pipeline visibility limited to personally assigned customer accounts. Strictly read-only.',
    permissions: ['View only your assigned customer deals', 'Read-only — no edits or mutations'],
    dataScope: 'Assigned AO scope • 705 deals',
    canWrite: false,
    icon: <User className="w-5 h-5" />,
  },
];

// Small capability chip used inside the demo modal role cards.
function CapabilityChip({ label, allowed }: { label: string; allowed: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ${
        allowed
          ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
          : 'text-zinc-400 border-zinc-200 bg-zinc-50 line-through decoration-zinc-300'
      }`}
    >
      {allowed ? <Check className="w-2.5 h-2.5" /> : <CircleSlash className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Playful geometric hero characters (right gradient panel)
// Pupils track the cursor; characters float and blink for ambient life.
// ---------------------------------------------------------------------------

interface SvgPoint {
  x: number;
  y: number;
}

const HERO_VIEWBOX = { width: 560, height: 600 };

// Maps the window cursor position into SVG viewBox coordinates (rAF-throttled).
function useSvgCursor(svgRef: React.RefObject<SVGSVGElement | null>): SvgPoint | null {
  const [cursor, setCursor] = useState<SvgPoint | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;

    const update = (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      setCursor({
        x: ((clientX - rect.left) / rect.width) * HERO_VIEWBOX.width,
        y: ((clientY - rect.top) / rect.height) * HERO_VIEWBOX.height,
      });
    };

    const handleMove = (e: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => update(e.clientX, e.clientY));
    };
    const handleLeave = () => {
      cancelAnimationFrame(frame);
      setCursor(null);
    };

    window.addEventListener('mousemove', handleMove);
    document.documentElement.addEventListener('mouseleave', handleLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('mousemove', handleMove);
      document.documentElement.removeEventListener('mouseleave', handleLeave);
    };
  }, [svgRef]);

  return cursor;
}

function Eye({
  cx,
  cy,
  r,
  cursor,
  blinkDelay,
}: {
  cx: number;
  cy: number;
  r: number;
  cursor: SvgPoint | null;
  blinkDelay?: string;
}) {
  // Offset the pupil toward the cursor, clamped so it never leaves the white.
  let dx = 0;
  let dy = 0;
  if (cursor) {
    const vx = cursor.x - cx;
    const vy = cursor.y - cy;
    const dist = Math.hypot(vx, vy) || 1;
    const offset = Math.min(r * 0.35, dist * 0.15);
    dx = (vx / dist) * offset;
    dy = (vy / dist) * offset;
  }

  return (
    <g className="hero-blink" style={blinkDelay ? { animationDelay: blinkDelay } : undefined}>
      <circle cx={cx} cy={cy} r={r} fill="#ffffff" />
      <circle
        cx={cx}
        cy={cy}
        r={r * 0.45}
        fill="#141414"
        style={{
          transform: `translate(${dx}px, ${dy}px)`,
          transition: 'transform 120ms ease-out',
        }}
      />
    </g>
  );
}

function HeroShapes() {
  const svgRef = useRef<SVGSVGElement>(null);
  const cursor = useSvgCursor(svgRef);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 560 600"
      aria-hidden="true"
      className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[560px] max-w-[92%] drop-shadow-xl"
    >
      {/* Tall indigo character */}
      <g className="hero-float-slow">
        <rect x="150" y="20" width="175" height="430" fill="#4743dd" />
        <Eye cx={205} cy={125} r={30} cursor={cursor} blinkDelay="0s" />
        <Eye cx={292} cy={122} r={30} cursor={cursor} blinkDelay="0.12s" />
        <rect x="230" y="196" width="46" height="7" rx="3.5" fill="#141414" />
      </g>
      {/* Black character */}
      <g className="hero-float-medium">
        <rect x="310" y="110" width="105" height="370" fill="#191919" />
        <Eye cx={340} cy={185} r={26} cursor={cursor} blinkDelay="1.3s" />
        <Eye cx={392} cy={185} r={26} cursor={cursor} blinkDelay="1.3s" />
      </g>
      {/* Yellow pill character */}
      <g className="hero-float-fast">
        <rect x="405" y="235" width="135" height="365" rx="67" fill="#f4c400" />
        <Eye cx={472} cy={305} r={27} cursor={cursor} blinkDelay="2.2s" />
        <rect x="444" y="362" width="58" height="7" rx="3.5" fill="#141414" />
      </g>
      {/* Orange dome character (front) */}
      <g className="hero-float-medium" style={{ animationDelay: '-2.5s' }}>
        <circle cx="235" cy="600" r="175" fill="#ef6b17" />
        <Eye cx={180} cy={505} r={30} cursor={cursor} blinkDelay="3.1s" />
        <Eye cx={295} cy={505} r={30} cursor={cursor} blinkDelay="3.1s" />
        <path d="M 208 552 A 30 30 0 0 0 268 552 Z" fill="#141414" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Demo Accounts Selector Modal (glass-card over the light design system)
// ---------------------------------------------------------------------------

interface DemoModalProps {
  isOpen: boolean;
  isLoading: boolean;
  activeDemoType: DemoRoleType | null;
  demoError: string;
  onClose: () => void;
  onSelect: (type: DemoRoleType) => void;
}

function DemoAccountsModal({
  isOpen,
  isLoading,
  activeDemoType,
  demoError,
  onClose,
  onSelect,
}: DemoModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Escape-to-close + focus management while the modal is open.
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/45 backdrop-blur-sm login-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-modal-title"
        tabIndex={-1}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-7 bg-white/85 backdrop-blur-xl border border-white/70 rounded-3xl shadow-2xl outline-none login-scale-in"
      >
        {/* Gradient modal header */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-sky-100/90 via-white/50 to-purple-100/90 border border-zinc-200/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white text-sky-600 border border-zinc-200 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="demo-modal-title" className={`${outfit.className} text-lg sm:text-xl font-bold text-zinc-900`}>
                Select a Demo Account
              </h2>
              <p className="text-xs text-zinc-500">
                Explore the Deals Portal with pre-configured role permissions &amp; live MSSQL data.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close demo account selector"
            className="p-1.5 text-zinc-400 hover:text-zinc-800 rounded-lg hover:bg-white/80 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* RBAC explainer strip */}
        <div className="flex items-start gap-2.5 mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200/70 text-[11px] text-blue-900 leading-relaxed">
          <Info className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" />
          <p>
            Each account is restricted by the same role-based scoping enforced in production:
            <span className="font-semibold"> Admins &amp; Sales AA </span>
            see all BUs with write access, while
            <span className="font-semibold"> BU Supervisors &amp; Account Officers </span>
            only see their own unit or assigned deals, read-only.
          </p>
        </div>

        {/* Demo error (sign-in failure recovery) */}
        {demoError && (
          <div
            role="alert"
            className="flex items-center gap-3 mt-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl"
          >
            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
            <p className="flex-1 text-xs">{demoError}</p>
            <button
              onClick={onClose}
              aria-label="Dismiss demo error"
              className="p-1 text-red-400 hover:text-red-600 rounded-md hover:bg-red-100 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 4 Demo Roles responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
          {DEMO_ROLES.map((role) => {
            const isLoggingInThis = isLoading && activeDemoType === role.type;

            return (
              <button
                key={role.type}
                onClick={() => onSelect(role.type)}
                disabled={isLoading}
                aria-label={`Sign in as ${role.title} — ${role.badge}`}
                className="overflow-hidden rounded-2xl text-left border border-zinc-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
              >
                {/* Gradient card header */}
                <div className={`flex items-center justify-between gap-2 p-3 bg-gradient-to-r ${role.headerGradient} border-b border-zinc-200/70`}>
                  <div className="p-2 rounded-lg bg-white/85 border border-zinc-200/80 shadow-sm">
                    <span className={role.iconColor}>{role.icon}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${role.badgeColor}`}>
                    {role.badge}
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-sm text-zinc-900 group-hover:text-sky-700 transition">
                    {role.title}
                  </h3>
                  <div className="text-[11px] font-mono text-zinc-500 mt-0.5 font-medium">
                    {role.identity}
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-2 leading-relaxed">{role.description}</p>

                  {/* Explicit permission bullets */}
                  <ul className="mt-2.5 space-y-1">
                    {role.permissions.map((permission) => (
                      <li key={permission} className="flex items-start gap-1.5 text-[11px] text-zinc-700">
                        <Check className="w-3 h-3 mt-0.5 text-emerald-600 shrink-0" />
                        <span>{permission}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Capability chips + data scope footer */}
                <div className="px-4 pb-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <CapabilityChip label="Read" allowed />
                    <CapabilityChip label="Write" allowed={role.canWrite} />
                    <CapabilityChip label="Export" allowed={false} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-100">
                    {isLoggingInThis ? (
                      <span className="flex items-center gap-2 flex-1 mr-2">
                        <span className="shimmer-skeleton h-3 w-full max-w-[160px] rounded" />
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600 shrink-0" />
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 truncate">
                        <Database className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span className="truncate">{role.dataScope}</span>
                      </span>
                    )}
                    {!isLoggingInThis && (
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition shrink-0" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-zinc-200/80 text-center">
          <p className="text-[11px] text-zinc-500">
            Connected to Microsoft SQL Server (
            <span className="text-zinc-600 font-mono">DealsRegistrationDB</span>) • Raw data exports
            are disabled for all roles
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Login Form (left light panel)
// ---------------------------------------------------------------------------

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorCode = searchParams?.get('error') || null;
  const authError = resolveAuthError(errorCode);

  const [isLoading, setIsLoading] = useState(false);
  const [activeDemoType, setActiveDemoType] = useState<DemoRoleType | null>(null);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoError, setDemoError] = useState('');
  const [isErrorDismissed, setIsErrorDismissed] = useState(false);

  // If the user retries after a failure, clear the stale error banner.
  const clearUrlError = useCallback(() => {
    if (errorCode) {
      setIsErrorDismissed(true);
      router.replace('/login');
    }
  }, [errorCode, router]);

  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';

  const handleGoogleLogin = async () => {
    clearUrlError();
    setIsLoading(true);
    try {
      await signIn('google', { callbackUrl });
    } catch {
      setIsLoading(false);
      setIsErrorDismissed(false);
      router.replace('/login?error=OAuthSignin');
    }
  };

  const handleDemoAccountLogin = async (type: DemoRoleType) => {
    setActiveDemoType(type);
    setIsLoading(true);
    setDemoError('');
    try {
      // Non-redirect sign-in so failures can be recovered inside the modal.
      const res = await signIn('demo-credentials', {
        redirect: false,
        accountType: type,
      });
      if (res?.error) {
        throw new Error(res.error);
      }
      // Full navigation (not client-side) to refresh the session cleanly.
      window.location.href = '/dashboard';
    } catch {
      setDemoError(
        'The demo session could not be started. Please close this dialog and try again.'
      );
      setActiveDemoType(null);
      setIsLoading(false);
    }
  };

  const closeDemoModal = useCallback(() => {
    if (isLoading) return;
    setIsDemoModalOpen(false);
    setActiveDemoType(null);
    setDemoError('');
  }, [isLoading]);

  const visibleAuthError = !isErrorDismissed ? authError : null;

  return (
    <>
      <div className="flex flex-col w-full h-full px-8 sm:px-12">
        {/* Centered sign-in block */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto text-center login-scale-in">
          <Image
            src="/login-mascot.png"
            alt="Deals Portal mascot"
            width={512}
            height={512}
            priority
            className="w-52 h-52 sm:w-56 sm:h-56 object-contain drop-shadow-sm [mask-image:radial-gradient(closest-side,black_78%,transparent_100%)]"
          />

          <h1 className={`${outfit.className} mt-4 text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight`}>
            Login your account
          </h1>
          <p className={`${inter.className} mt-2 text-sm text-zinc-500`}>
            Welcome back! Please login to continue using the Deals Portal.
          </p>

          {visibleAuthError && (
            <div
              role="alert"
              aria-live="assertive"
              className="relative flex items-start w-full mt-6 p-4 text-left bg-red-50 border border-red-200 rounded-xl"
            >
              <ShieldAlert className="w-5 h-5 mr-3 mt-0.5 text-red-500 shrink-0" />
              <div className="flex-1 pr-6">
                <p className="text-sm font-semibold text-red-800">{visibleAuthError.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-red-700/90">
                  {visibleAuthError.description}
                </p>
              </div>
              <button
                onClick={clearUrlError}
                aria-label="Dismiss error message"
                className="absolute top-3 right-3 p-1 text-red-400 hover:text-red-600 rounded-md hover:bg-red-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="w-full mt-8 space-y-3">
            {/* Google sign-in (reference style: white logo segment + blue body) */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="group flex items-center w-full rounded-lg overflow-hidden border border-blue-800/20 bg-[#2472e8] hover:bg-[#1b62d4] shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center bg-white px-3 py-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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
              </span>
              <span className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-white">
                {isLoading && !activeDemoType ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirecting to Google…
                  </>
                ) : (
                  'Sign in with Google'
                )}
              </span>
            </button>

            <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-400">
              <span className="h-px flex-1 bg-zinc-200" />
              OR
              <span className="h-px flex-1 bg-zinc-200" />
            </div>

            <button
              onClick={() => setIsDemoModalOpen(true)}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full py-3 text-xs font-semibold text-zinc-700 bg-white/70 hover:bg-white border border-zinc-300 hover:border-zinc-400 rounded-lg shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Explore with Demo Accounts</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>

          <div className="mt-8 text-center text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3" />
            <span>Protected by Enterprise NextAuth SSO</span>
          </div>
        </div>
      </div>

      <DemoAccountsModal
        isOpen={isDemoModalOpen}
        isLoading={isLoading}
        activeDemoType={activeDemoType}
        demoError={demoError}
        onClose={closeDemoModal}
        onSelect={handleDemoAccountLogin}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Page shell: split-screen layout (light form panel + gradient hero panel)
// ---------------------------------------------------------------------------

export default function LoginPage() {
  return (
    <div className="login-light-scope relative flex min-h-screen bg-[#f8f9fa] overflow-hidden selection:bg-pink-300/50">
      {/* Left: brand + sign-in form */}
      <div className="relative flex flex-col w-full lg:w-[45%] min-h-screen">
        {/* Brand header */}
        <header className="flex items-center gap-2.5 px-8 sm:px-10 pt-7">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 shadow-sm">
            <Fingerprint className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <span className={`${outfit.className} text-lg font-bold text-zinc-900 tracking-tight`}>
            Deals Portal
          </span>
        </header>

        <main className="flex-1 flex flex-col">
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </main>

        {/* Footer */}
        <footer className="flex items-center justify-between px-8 sm:px-10 pb-6 text-xs text-zinc-500">
          <span>Copyright © 2026 ICS</span>
          <a href="#" className="font-medium text-zinc-800 hover:underline">
            Privacy Policy
          </a>
        </footer>
      </div>

      {/* Right: gradient hero panel */}
      <div
        className="relative hidden lg:flex flex-1 flex-col overflow-hidden"
        style={{
          background:
            'linear-gradient(155deg, #f2a3c2 0%, #e17ba7 40%, #c65589 75%, #ad4176 100%)',
        }}
      >
        <div className="relative z-10 px-16 xl:px-24 pt-24">
          <h2 className={`${outfit.className} max-w-xl text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight`}>
            Your deal registrations, managed seamlessly.
          </h2>
          <p className={`${inter.className} mt-6 max-w-lg text-base xl:text-lg text-white/85 leading-relaxed`}>
            Log in to register deals, track pipeline status, and collaborate with your business
            units. We&apos;re excited to help you streamline your sales workflow!
          </p>
        </div>

        <HeroShapes />
      </div>
    </div>
  );
}
