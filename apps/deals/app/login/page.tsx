'use client';

import { signIn, getSession } from 'next-auth/react';
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
    title: 'Wrong Account / Unregistered User',
    description:
      'Wrong account or unregistered user. Your account was not found in the ICS corporate directory. Please contact IT Support if you are unregistered to request access.',
  },
  OAuthAccountNotLinked: {
    title: 'Account Already Linked',
    description:
      'This email is already linked to a different sign-in method. Please contact IT Support for account assistance.',
  },
  OAuthCallback: {
    title: 'Sign-in Incomplete',
    description:
      'The sign-in flow was interrupted. If this account is unregistered, please contact IT Support.',
  },
  OAuthCallbackError: {
    title: 'Authentication Failed',
    description:
      'Wrong account or unauthorized login. If your account is unregistered, please contact IT Support.',
  },
  OAuthSignin: {
    title: 'Unable to Sign In',
    description:
      'Could not start sign-in session. Please check your connection or contact IT Support.',
  },
  Configuration: {
    title: 'Authentication Configuration Error',
    description:
      'There is an authentication service configuration issue. Please contact IT Support.',
  },
  CredentialsSignin: {
    title: 'Demo Session Failed',
    description:
      'Wrong account or demo session could not be created. Please contact IT Support if you need assistance.',
  },
  SessionRequired: {
    title: 'Session Required',
    description: 'Please sign in with your corporate account to access the Deals Portal.',
  },
  Default: {
    title: 'Unsuccessful Login / Wrong Account',
    description:
      'Wrong account or unregistered user. If you are not yet registered, please contact IT Support.',
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
function useSvgCursor(svgRef: React.RefObject<SVGSVGElement | null>): SvgPoint {
  // Default glance toward the login form on the left
  const [cursor, setCursor] = useState<SvgPoint>({ x: -120, y: 260 });

  useEffect(() => {
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

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('pointermove', handleMove, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('pointermove', handleMove);
    };
  }, [svgRef]);

  return cursor;
}

// Sequential blink controller: Blue (0) -> Black (1) -> Yellow (2) -> Orange (3)
function useSequentialBlink() {
  const [blinkState, setBlinkState] = useState<{ [key: number]: boolean }>({
    0: false, // Blue
    1: false, // Black
    2: false, // Yellow
    3: false, // Orange
  });

  useEffect(() => {
    let currentChar = 0;
    const interval = setInterval(() => {
      const target = currentChar;
      setBlinkState((prev) => ({ ...prev, [target]: true }));

      // Natural gentle blink closure for 200ms
      setTimeout(() => {
        setBlinkState((prev) => ({ ...prev, [target]: false }));
      }, 200);

      // Cycle gently: 0 -> 1 -> 2 -> 3 -> 0
      currentChar = (currentChar + 1) % 4;
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  return blinkState;
}

function Eye({
  cx,
  cy,
  r,
  cursor,
  isBlinking = false,
  isSad = false,
}: {
  cx: number;
  cy: number;
  r: number;
  cursor: SvgPoint;
  isBlinking?: boolean;
  isSad?: boolean;
}) {
  // Offset the pupil toward the cursor, clamped so it never leaves the white.
  const vx = cursor.x - cx;
  const vy = cursor.y - cy;
  const dist = Math.hypot(vx, vy) || 1;
  const maxOffset = r * 0.52;
  const offset = Math.min(maxOffset, Math.max(5, dist * 0.25));
  const dx = isSad ? 0 : (vx / dist) * offset;
  const dy = isSad ? r * 0.38 : (vy / dist) * offset;

  // When blinking, collapse vertical radius (ry) cleanly
  const ry = isBlinking ? Math.max(1.5, r * 0.08) : r;
  const pupilRy = isBlinking ? Math.max(1, r * 0.45 * 0.08) : r * 0.45;

  return (
    <g>
      {/* Sclera (White Eye) */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={r}
        ry={ry}
        fill="#ffffff"
        style={{
          transition: 'ry 100ms ease-in-out',
        }}
      />
      {/* Pupil (Black) */}
      <ellipse
        cx={cx + dx}
        cy={cy + (isBlinking ? 0 : dy)}
        rx={r * 0.45}
        ry={pupilRy}
        fill="#141414"
        style={{
          transition: 'all 200ms ease-in-out',
        }}
      />
    </g>
  );
}

function HeroShapes({
  isCelebrating = false,
  isSad = false,
}: {
  isCelebrating?: boolean;
  isSad?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cursor = useSvgCursor(svgRef);
  const blinkState = useSequentialBlink();

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 560 600"
      aria-hidden="true"
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[560px] max-w-[92%] drop-shadow-xl"
    >
      {/* 1. Tall indigo character (Blue) */}
      <g className={isCelebrating ? 'hero-celebrate-0' : isSad ? 'hero-sad-slump' : 'hero-float-slow'}>
        <rect x="150" y="20" width="175" height="590" fill="#4743dd" />
        <Eye cx={205} cy={125} r={30} cursor={cursor} isBlinking={!isCelebrating && blinkState[0]} isSad={isSad} />
        <Eye cx={292} cy={122} r={30} cursor={cursor} isBlinking={!isCelebrating && blinkState[0]} isSad={isSad} />
        {isCelebrating ? (
          <g className="hero-mouth-laugh">
            <path d="M 226 190 Q 253 234 280 190 Z" fill="#141414" />
            <path d="M 236 215 Q 253 205 270 215 Q 253 228 236 215 Z" fill="#ff6b8b" />
          </g>
        ) : isSad ? (
          <>
            <path d="M 222 212 Q 253 178 284 212" stroke="#141414" strokeWidth="6.5" fill="none" strokeLinecap="round" />
            {/* Sad teardrop */}
            <path d="M 205 160 C 205 160 199 172 199 177 C 199 181 202 184 205 184 C 208 184 211 181 211 177 C 211 172 205 160 205 160 Z" fill="#60a5fa" />
          </>
        ) : (
          <rect x="230" y="195" width="46" height="7" rx="3.5" fill="#141414" />
        )}
      </g>
      {/* 2. Black character */}
      <g className={isCelebrating ? 'hero-celebrate-1' : isSad ? 'hero-sad-slump' : 'hero-float-medium'}>
        <rect x="310" y="105" width="105" height="505" fill="#191919" />
        <Eye cx={340} cy={180} r={26} cursor={cursor} isBlinking={!isCelebrating && blinkState[1]} isSad={isSad} />
        <Eye cx={392} cy={180} r={26} cursor={cursor} isBlinking={!isCelebrating && blinkState[1]} isSad={isSad} />
        {isCelebrating ? (
          <g className="hero-mouth-laugh" style={{ animationDelay: '0.12s' }}>
            <path d="M 346 220 Q 366 256 386 220 Z" fill="#ffffff" />
            <path d="M 354 240 Q 366 232 378 240 Q 366 250 354 240 Z" fill="#ff6b8b" />
          </g>
        ) : isSad ? (
          <path d="M 344 246 Q 366 220 388 246" stroke="#ffffff" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        ) : (
          <rect x="352" y="226" width="28" height="5" rx="2.5" fill="#333333" />
        )}
      </g>
      {/* 3. Yellow pill character */}
      <g className={isCelebrating ? 'hero-celebrate-2' : isSad ? 'hero-sad-slump' : 'hero-float-fast'}>
        <rect x="405" y="230" width="135" height="380" rx="67" fill="#f4c400" />
        <Eye cx={472} cy={300} r={27} cursor={cursor} isBlinking={!isCelebrating && blinkState[2]} isSad={isSad} />
        {isCelebrating ? (
          <g className="hero-mouth-laugh" style={{ animationDelay: '0.24s' }}>
            <path d="M 444 347 Q 473 393 502 347 Z" fill="#141414" />
            <path d="M 456 375 Q 473 363 490 375 Q 473 388 456 375 Z" fill="#ff6b8b" />
          </g>
        ) : isSad ? (
          <path d="M 440 376 Q 473 340 506 376" stroke="#141414" strokeWidth="6.5" fill="none" strokeLinecap="round" />
        ) : (
          <rect x="444" y="357" width="58" height="7" rx="3.5" fill="#141414" />
        )}
      </g>
      {/* 4. Orange dome character (front) */}
      <g
        className={isCelebrating ? 'hero-celebrate-3' : isSad ? 'hero-sad-slump' : 'hero-float-medium'}
        style={!isCelebrating && !isSad ? { animationDelay: '-2.5s' } : undefined}
      >
        <ellipse cx="235" cy="600" rx="175" ry="165" fill="#ef6b17" />
        <Eye cx={180} cy={488} r={28} cursor={cursor} isBlinking={!isCelebrating && blinkState[3]} isSad={isSad} />
        <Eye cx={290} cy={488} r={28} cursor={cursor} isBlinking={!isCelebrating && blinkState[3]} isSad={isSad} />
        {isCelebrating ? (
          <g className="hero-mouth-laugh" style={{ animationDelay: '0.18s' }}>
            <path d="M 198 528 Q 235 578 272 528 Z" fill="#141414" />
            <path d="M 212 558 Q 235 544 258 558 Q 235 572 212 558 Z" fill="#ff6b8b" />
          </g>
        ) : isSad ? (
          <path d="M 196 550 Q 235 512 274 550" stroke="#141414" strokeWidth="7.5" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M 205 532 A 30 30 0 0 0 265 532 Z" fill="#141414" />
        )}
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Google Account Picker Modal (Official Dark Google OAuth UI)
// ---------------------------------------------------------------------------

interface GoogleModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onSelect: (email?: string, name?: string) => void;
}

function GoogleAccountPickerModal({
  isOpen,
  isLoading,
  onClose,
  onSelect,
}: GoogleModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [isCustomView, setIsCustomView] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setIsCustomView(false);
      setCustomEmail('');
      setCustomName('');
      return;
    }

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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm login-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[720px] login-scale-in">
        {/* Main Google Dark Card */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="google-modal-title"
          tabIndex={-1}
          className="relative w-full p-6 sm:p-9 bg-[#131314] text-[#e3e3e3] border border-[#3c4043] rounded-[28px] shadow-2xl outline-none"
        >
          {/* Top Bar: Google G logo + Sign in with Google */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              <span className="text-sm font-medium text-[#e3e3e3]">Sign in with Google</span>
            </div>

            <button
              onClick={onClose}
              aria-label="Close Google sign-in dialog"
              className="p-1.5 text-[#9aa0a6] hover:text-white rounded-full hover:bg-[#28292a] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2-Column Content Layout (Matching screenshot) */}
          {isCustomView ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 mt-7 sm:mt-9 items-start">
              <div className="md:col-span-5 pr-0 md:pr-4">
                <h2
                  id="google-modal-title"
                  className="text-3xl sm:text-[34px] font-normal text-[#e3e3e3] tracking-tight leading-tight"
                >
                  Sign in
                </h2>
                <p className="text-sm text-[#c4c7c5] mt-3 leading-relaxed">
                  with your <span className="text-[#a8c7fa] font-medium">@ics.com.ph</span> Workspace account
                </p>
              </div>

              <div className="md:col-span-7 flex flex-col space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#c4c7c5] mb-1.5">
                    Corporate Email
                  </label>
                  <input
                    type="email"
                    placeholder="name@ics.com.ph"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1e1f20] border border-[#5f6368] rounded-xl text-sm text-[#e3e3e3] placeholder-[#80868b] focus:outline-none focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#a8c7fa]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#c4c7c5] mb-1.5">
                    Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1e1f20] border border-[#5f6368] rounded-xl text-sm text-[#e3e3e3] placeholder-[#80868b] focus:outline-none focus:border-[#a8c7fa] focus:ring-1 focus:ring-[#a8c7fa]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomView(false)}
                    className="text-sm text-[#a8c7fa] hover:underline font-medium focus:outline-none"
                  >
                    Back to accounts
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelect(customEmail.trim(), customName.trim())}
                    disabled={!customEmail.trim() || isLoading}
                    className="px-6 py-2.5 bg-[#a8c7fa] text-[#040e29] text-sm font-semibold rounded-full hover:bg-[#c2e7ff] transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#a8c7fa]"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 mt-7 sm:mt-9 items-start">
              {/* Left Column: Heading */}
              <div className="md:col-span-5 pr-0 md:pr-4">
                <h2
                  id="google-modal-title"
                  className="text-3xl sm:text-[34px] font-normal text-[#e3e3e3] tracking-tight leading-tight"
                >
                  Choose an account
                </h2>
                <p className="text-sm text-[#c4c7c5] mt-3 leading-relaxed">
                  to continue to <span className="text-[#a8c7fa] font-medium">deal-reg</span>
                </p>
              </div>

              {/* Right Column: Account List */}
              <div className="md:col-span-7 flex flex-col divide-y divide-[#3c4043]/60">
                {/* Account 1: Bharon Christopher Candelaria (Corporate) */}
                <button
                  onClick={() => onSelect('bcandelaria@ics.com.ph', 'Bharon Christopher Candelaria')}
                  disabled={isLoading}
                  className="group flex items-center gap-3.5 w-full py-3.5 px-3 text-left rounded-xl hover:bg-[#28292a] transition-colors focus:outline-none focus:bg-[#28292a]"
                >
                  <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 border border-[#5f6368] bg-[#2a2b2e] flex items-center justify-center text-white text-xs font-semibold shadow-inner">
                    <svg className="w-full h-full" viewBox="0 0 36 36" fill="none">
                      <rect width="36" height="36" fill="#303134" />
                      <circle cx="18" cy="13" r="5.5" fill="#d0d4dc" />
                      <path d="M 6 32 C 6 23 11 19 18 19 C 25 19 30 23 30 32 Z" fill="#202124" />
                      <path d="M 15 21 L 18 26 L 21 21 Z" fill="#ffffff" />
                      <path d="M 17 24 L 18 32 L 19 24 Z" fill="#4285F4" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[#e3e3e3] truncate">
                      Bharon Christopher Candelaria
                    </div>
                    <div className="text-xs text-[#9aa0a6] truncate mt-0.5">
                      bcandelaria@ics.com.ph
                    </div>
                  </div>
                </button>

                {/* Account 2: Bharon (Personal) */}
                <button
                  onClick={() => onSelect('candelariabharon0014@gmail.com', 'Bharon')}
                  disabled={isLoading}
                  className="group flex items-center gap-3.5 w-full py-3.5 px-3 text-left rounded-xl hover:bg-[#28292a] transition-colors focus:outline-none focus:bg-[#28292a]"
                >
                  <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 border border-[#5f6368] bg-[#2a2b2e] flex items-center justify-center text-white text-xs font-semibold shadow-inner">
                    <svg className="w-full h-full" viewBox="0 0 36 36" fill="none">
                      <rect width="36" height="36" fill="#3c4043" />
                      <circle cx="18" cy="13" r="5.5" fill="#e3e3e3" />
                      <path d="M 6 32 C 6 23 11 19 18 19 C 25 19 30 23 30 32 Z" fill="#202124" />
                      <path d="M 15 21 L 18 25 L 21 21 Z" fill="#ffffff" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[#e3e3e3] truncate">
                      Bharon
                    </div>
                    <div className="text-xs text-[#9aa0a6] truncate mt-0.5">
                      candelariabharon0014@gmail.com
                    </div>
                  </div>
                </button>

                {/* Account 3: Use another account */}
                <button
                  onClick={() => setIsCustomView(true)}
                  disabled={isLoading}
                  className="group flex items-center gap-3.5 w-full py-3.5 px-3 text-left rounded-xl hover:bg-[#28292a] transition-colors focus:outline-none focus:bg-[#28292a]"
                >
                  <div className="w-9 h-9 rounded-full border border-[#5f6368] flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[#e3e3e3]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[#e3e3e3] truncate">
                      Use another account
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer outside the card (Matching Google layout in screenshot) */}
        <div className="flex items-center justify-between mt-4 px-3 text-xs text-[#9aa0a6]">
          <div className="flex items-center gap-1 cursor-pointer hover:text-[#e3e3e3] transition">
            <span>English (United States)</span>
            <span className="text-[10px]">▼</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-[#e3e3e3] transition">Help</a>
            <a href="#" className="hover:text-[#e3e3e3] transition">Privacy</a>
            <a href="#" className="hover:text-[#e3e3e3] transition">Terms</a>
          </div>
        </div>
      </div>
    </div>
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
// Login Form (Official Google Button & Modal Account Picker)
// ---------------------------------------------------------------------------

interface LoginFormProps {
  onAccountSelected: (action: () => Promise<void>) => void;
  onMoodChange: (mood: 'idle' | 'sad') => void;
  isBusy: boolean;
}

function LoginForm({ onAccountSelected, onMoodChange, isBusy }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorCode = searchParams?.get('error') || null;
  const authError = resolveAuthError(errorCode);

  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [demoError, setDemoError] = useState('');
  const [isErrorDismissed, setIsErrorDismissed] = useState(false);

  const visibleAuthError = !isErrorDismissed ? authError : null;

  useEffect(() => {
    if (visibleAuthError) {
      onMoodChange('sad');
    } else {
      onMoodChange('idle');
    }
  }, [visibleAuthError, onMoodChange]);

  const clearUrlError = useCallback(() => {
    if (errorCode) {
      setIsErrorDismissed(true);
      onMoodChange('idle');
      router.replace('/login');
    }
  }, [errorCode, onMoodChange, router]);

  const handleSelectCorporateGoogle = (email?: string, name?: string) => {
    setIsGoogleModalOpen(false);

    const selectedEmail = email || 'bcandelaria@ics.com.ph';
    const selectedName = name || 'Bharon Christopher Candelaria';

    if (selectedEmail && !selectedEmail.endsWith('@ics.com.ph')) {
      // Non-corporate unauthorized account -> Show sad/long face and AccessDenied error, NO celebration!
      onMoodChange('sad');
      setIsErrorDismissed(false);
      router.replace('/login?error=AccessDenied');
      return;
    }

    clearUrlError();
    onMoodChange('idle');
    onAccountSelected(async () => {
      const res = await signIn('demo-credentials', {
        accountType: 'google-corporate',
        email: selectedEmail,
        accountName: selectedName,
        redirect: false,
        callbackUrl: '/dashboard',
      });

      if (res?.error || !res?.ok) {
        onMoodChange('sad');
        throw new Error(res?.error || 'AccessDenied');
      }
    });
  };

  const handleSelectDemoAccount = (type: DemoRoleType) => {
    setIsDemoOpen(false);
    clearUrlError();
    onMoodChange('idle');
    onAccountSelected(async () => {
      const res = await signIn('demo-credentials', {
        accountType: type,
        redirect: false,
        callbackUrl: '/dashboard',
      });
      if (res?.error) {
        onMoodChange('sad');
        throw new Error(res.error);
      }
    });
  };

  return (
    <>
      <div className="flex flex-col w-full h-full px-7 sm:px-12 justify-center">
        <div className="w-full max-w-sm mx-auto text-left login-scale-in">
          {/* Header */}
          <div className="text-center sm:text-left mb-6">
            <h1 className={`${outfit.className} text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight`}>
              Welcome back
            </h1>
            <p className={`${inter.className} mt-1.5 text-xs text-zinc-500`}>
              Sign in to manage deal registrations &amp; pipelines
            </p>
          </div>

          {visibleAuthError && (
            <div
              role="alert"
              aria-live="assertive"
              className="relative flex items-start w-full mb-5 p-4 text-left bg-gradient-to-r from-amber-50/90 to-rose-50/90 border border-amber-300/80 rounded-xl shadow-xs animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-700 border border-amber-500/20 mr-3 mt-0.5 shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 pr-6">
                <p className="text-sm font-bold text-zinc-900">{visibleAuthError.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-700">
                  {visibleAuthError.description}
                </p>
                <div className="mt-2 pt-1.5 border-t border-amber-200/80 text-[11px] font-semibold text-amber-900 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                  <span>Wrong account? Please contact IT if unregistered.</span>
                </div>
              </div>
              <button
                onClick={clearUrlError}
                aria-label="Dismiss error message"
                className="absolute top-3 right-3 p-1 text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-zinc-200/60 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Login Actions */}
          <div className="space-y-3.5">
            {/* Official Google Sign In Button */}
            <button
              onClick={() => setIsGoogleModalOpen(true)}
              disabled={isBusy}
              className="group relative flex items-center justify-center w-full px-4 py-3.5 bg-white hover:bg-zinc-50/80 active:bg-zinc-100 text-zinc-700 hover:text-zinc-900 border border-zinc-300 hover:border-zinc-400 rounded-2xl font-medium text-sm transition-all duration-150 shadow-xs hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="absolute left-4 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              </div>
              <span className="font-semibold tracking-tight">Sign in with Google</span>
            </button>

            {/* Subtle Divider */}
            <div className="relative flex items-center justify-center my-2">
              <div className="w-full border-t border-zinc-200" />
              <span className="absolute bg-white px-3 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                or
              </span>
            </div>

            {/* Explore with Demo Accounts Button */}
            <button
              onClick={() => setIsDemoOpen(true)}
              disabled={isBusy}
              className="group flex items-center justify-between w-full p-3.5 text-left bg-zinc-50/80 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300 rounded-2xl transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-zinc-400/50 disabled:opacity-60"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-800 truncate">
                    Explore with Demo Accounts
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate">Sales Admin, AA, BU Head, or AO</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-1 transition shrink-0 ml-2" />
            </button>
          </div>

          <div className="mt-8 pt-4 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-emerald-600" />
              Enterprise NextAuth SSO
            </span>
            <span>Google Workspace</span>
          </div>
        </div>
      </div>

      <GoogleAccountPickerModal
        isOpen={isGoogleModalOpen}
        isLoading={isBusy}
        onClose={() => setIsGoogleModalOpen(false)}
        onSelect={handleSelectCorporateGoogle}
      />

      <DemoAccountsModal
        isOpen={isDemoOpen}
        isLoading={isBusy}
        activeDemoType={null}
        demoError={demoError}
        onClose={() => setIsDemoOpen(false)}
        onSelect={handleSelectDemoAccount}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Page Shell: Seamless Multi-Step Animation Flow
// ---------------------------------------------------------------------------

type AnimationStep = 'idle' | 'celebrating' | 'expanding' | 'loading';

export default function LoginPage() {
  const router = useRouter();
  const [animationStep, setAnimationStep] = useState<AnimationStep>('idle');
  const [characterMood, setCharacterMood] = useState<'idle' | 'sad'>('idle');
  const pendingAuthActionRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    router.prefetch('/dashboard');
  }, [router]);

  const handleAccountSelected = useCallback(
    (authAction: () => Promise<void>) => {
      if (animationStep !== 'idle') return;
      pendingAuthActionRef.current = authAction;

      // 1. Trigger celebration jump for exactly 3 seconds (lessened by 2s from 5s)
      setAnimationStep('celebrating');

      // 2. After 3 seconds, expand the white panel across the entire screen
      setTimeout(() => {
        setAnimationStep('expanding');

        // 3. Once fully expanded (750ms later), transition into minimalist B&W loading state
        setTimeout(async () => {
          setAnimationStep('loading');

          // 4. Complete authentication and navigate to dashboard
          try {
            if (pendingAuthActionRef.current) {
              await pendingAuthActionRef.current();
            }
            router.push('/dashboard');
          } catch {
            setAnimationStep('idle');
            setCharacterMood('sad');
            router.replace('/login?error=AccessDenied');
          }
        }, 750);
      }, 3000);
    },
    [animationStep, router]
  );

  const isExpanded = animationStep === 'expanding' || animationStep === 'loading';
  const isCelebrating = animationStep === 'celebrating';
  const isSad = characterMood === 'sad' && !isCelebrating;
  const isLoading = animationStep === 'loading';

  return (
    <div className="login-light-scope relative flex min-h-screen bg-[#f8f9fa] overflow-hidden selection:bg-pink-300/50">
      {/* Left White Panel (Expands to cover full viewport after celebration) */}
      <div
        className={`login-panel-expand relative flex flex-col min-h-screen bg-white z-20 ${
          isExpanded
            ? 'w-full absolute inset-0 z-40'
            : 'w-full lg:w-[45%]'
        }`}
      >
        {/* Minimalist Black-and-White Loading State */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white login-fade-in">
            <div className="flex flex-col items-center max-w-xs text-center">
              {/* Clean Minimalist B&W Spinner */}
              <div className="w-9 h-9 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mb-4" />
              <h3 className={`${outfit.className} text-lg font-bold text-zinc-900 tracking-tight`}>
                Signing in
              </h3>
              <p className={`${inter.className} text-xs text-zinc-500 mt-1`}>
                Directing to Deals Portal
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Brand Header */}
            <header className="flex items-center gap-2.5 px-8 sm:px-10 pt-7">
              <div className="p-1.5 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 shadow-sm">
                <Fingerprint className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
              <span className={`${outfit.className} text-lg font-bold text-zinc-900 tracking-tight`}>
                Deals Portal
              </span>
            </header>

            <main className="flex-1 flex flex-col justify-center">
              <Suspense
                fallback={
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
                  </div>
                }
              >
                <LoginForm
                  onAccountSelected={handleAccountSelected}
                  onMoodChange={setCharacterMood}
                  isBusy={animationStep !== 'idle'}
                />
              </Suspense>
            </main>

            {/* Footer */}
            <footer className="flex items-center justify-between px-8 sm:px-10 pb-6 text-xs text-zinc-500">
              <span>Copyright © 2026 ICS</span>
              <a href="#" className="font-medium text-zinc-800 hover:underline">
                Privacy Policy
              </a>
            </footer>
          </>
        )}
      </div>

      {/* Right Gradient Hero Panel with Characters (Celebrating or Sad Long-Face) */}
      <div
        className="relative hidden lg:flex flex-1 flex-col overflow-hidden transition-opacity duration-500"
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

        <HeroShapes isCelebrating={isCelebrating} isSad={isSad} />
      </div>
    </div>
  );
}
