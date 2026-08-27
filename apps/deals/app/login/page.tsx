'use client';

import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DEAL_QUERY_KEYS } from '@/hooks/useDealsQuery';
import { getDashboardSummary, getScopedDeals } from '@/app/actions/deals';
import {
  ShieldAlert,
  Loader2,
  Fingerprint,
  X,
  Info,
} from 'lucide-react';
import { Inter, Outfit } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const outfit = Outfit({ subsets: ['latin'] });

// ---------------------------------------------------------------------------
// Authentication error mapping
// ---------------------------------------------------------------------------

interface AuthErrorInfo {
  title: string;
  description: string;
}

const AUTH_ERROR_MESSAGES: Record<string, AuthErrorInfo> = {
  AccessDenied: {
    title: 'Access Restricted / Unauthorized Role',
    description:
      'Access restricted: Only Account Officers (AO), BU Heads, and Administrators are authorized to access the Deals Portal. If your account is unregistered or inactive, please contact IT Support.',
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
    title: 'Authentication Failed',
    description:
      'Wrong account or credentials could not be verified. Please contact IT Support if you need assistance.',
  },
  SessionRequired: {
    title: 'Session Required',
    description: 'Please sign in with your corporate Google Workspace account to access the Deals Portal.',
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
// Playful geometric hero characters (Right gradient panel)
// Pupils track the cursor; characters float and blink for ambient life.
// ---------------------------------------------------------------------------

interface SvgPoint {
  x: number;
  y: number;
}

const HERO_VIEWBOX = { width: 560, height: 600 };
const MOBILE_HERO_VIEWBOX = { width: 380, height: 130 };

function useSvgCursor(
  svgRef: React.RefObject<SVGSVGElement | null>,
  viewBox: { width: number; height: number } = HERO_VIEWBOX
): SvgPoint {
  const [cursor, setCursor] = useState<SvgPoint>({ x: viewBox.width / 2, y: viewBox.height / 3 });

  useEffect(() => {
    let frame = 0;

    const update = (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      setCursor({
        x: ((clientX - rect.left) / rect.width) * viewBox.width,
        y: ((clientY - rect.top) / rect.height) * viewBox.height,
      });
    };

    const handleMove = (e: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => update(e.clientX, e.clientY));
    };

    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => update(e.touches[0].clientX, e.touches[0].clientY));
      }
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('touchmove', handleTouch, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('touchmove', handleTouch);
    };
  }, [svgRef, viewBox.width, viewBox.height]);

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
  const vx = cursor.x - cx;
  const vy = cursor.y - cy;
  const dist = Math.hypot(vx, vy) || 1;
  const maxOffset = r * 0.52;
  const offset = Math.min(maxOffset, Math.max(5, dist * 0.25));
  const dx = isSad ? 0 : (vx / dist) * offset;
  const dy = isSad ? r * 0.38 : (vy / dist) * offset;

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

function MobileHeroShapes({
  isCelebrating = false,
  isSad = false,
}: {
  isCelebrating?: boolean;
  isSad?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cursor = useSvgCursor(svgRef, MOBILE_HERO_VIEWBOX);
  const blinkState = useSequentialBlink();

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 380 130"
      aria-hidden="true"
      className="w-full h-full max-h-[145px] drop-shadow-md select-none block mx-auto overflow-hidden"
    >
      {/* 1. Tall indigo character (Blue) - Far Left */}
      <g className={isCelebrating ? 'hero-celebrate-0' : isSad ? 'hero-sad-slump' : 'hero-float-slow'}>
        <rect x="18" y="16" width="76" height="160" rx="18" fill="#4743dd" />
        <Eye cx={42} cy={48} r={13.5} cursor={cursor} isBlinking={!isCelebrating && blinkState[0]} isSad={isSad} />
        <Eye cx={70} cy={48} r={13.5} cursor={cursor} isBlinking={!isCelebrating && blinkState[0]} isSad={isSad} />
        {isCelebrating ? (
          <g className="hero-mouth-laugh">
            <path d="M 44 72 Q 56 90 68 72 Z" fill="#141414" />
            <path d="M 48 80 Q 56 75 64 80 Q 56 86 48 80 Z" fill="#ff6b8b" />
          </g>
        ) : isSad ? (
          <>
            <path d="M 44 82 Q 56 68 68 82" stroke="#141414" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M 42 58 C 42 58 39 65 39 68 C 39 70 41 72 42 72 C 44 72 46 70 46 68 C 46 65 42 58 42 58 Z" fill="#60a5fa" />
          </>
        ) : (
          <rect x="44" y="76" width="24" height="4" rx="2" fill="#141414" />
        )}
      </g>

      {/* 2. Black character - Center Left */}
      <g className={isCelebrating ? 'hero-celebrate-1' : isSad ? 'hero-sad-slump' : 'hero-float-medium'}>
        <rect x="108" y="22" width="72" height="160" rx="16" fill="#191919" />
        <Eye cx={128} cy={54} r={13.5} cursor={cursor} isBlinking={!isCelebrating && blinkState[1]} isSad={isSad} />
        <Eye cx={160} cy={54} r={13.5} cursor={cursor} isBlinking={!isCelebrating && blinkState[1]} isSad={isSad} />
        {isCelebrating ? (
          <g className="hero-mouth-laugh" style={{ animationDelay: '0.12s' }}>
            <path d="M 132 78 Q 144 94 156 78 Z" fill="#ffffff" />
            <path d="M 136 85 Q 144 81 152 85 Q 144 91 136 85 Z" fill="#ff6b8b" />
          </g>
        ) : isSad ? (
          <path d="M 132 86 Q 144 74 156 86" stroke="#ffffff" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        ) : (
          <rect x="132" y="80" width="24" height="4" rx="2" fill="#404040" />
        )}
      </g>

      {/* 3. Orange dome character - Center Right */}
      <g
        className={isCelebrating ? 'hero-celebrate-3' : isSad ? 'hero-sad-slump' : 'hero-float-medium'}
        style={!isCelebrating && !isSad ? { animationDelay: '-2.5s' } : undefined}
      >
        <ellipse cx="232" cy="130" rx="46" ry="66" fill="#ef6b17" />
        <Eye cx={214} cy={90} r={13.5} cursor={cursor} isBlinking={!isCelebrating && blinkState[3]} isSad={isSad} />
        <Eye cx={250} cy={90} r={13.5} cursor={cursor} isBlinking={!isCelebrating && blinkState[3]} isSad={isSad} />
        {isCelebrating ? (
          <g className="hero-mouth-laugh" style={{ animationDelay: '0.18s' }}>
            <path d="M 220 106 Q 232 124 244 106 Z" fill="#141414" />
            <path d="M 224 114 Q 232 110 240 114 Q 232 120 224 114 Z" fill="#ff6b8b" />
          </g>
        ) : isSad ? (
          <path d="M 220 116 Q 232 104 244 116" stroke="#141414" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M 220 106 Q 232 118 244 106 Z" fill="#141414" />
        )}
      </g>

      {/* 4. Yellow pill character - Far Right */}
      <g className={isCelebrating ? 'hero-celebrate-2' : isSad ? 'hero-sad-slump' : 'hero-float-fast'}>
        <rect x="290" y="18" width="74" height="160" rx="37" fill="#f4c400" />
        <Eye cx={327} cy={52} r={14.5} cursor={cursor} isBlinking={!isCelebrating && blinkState[2]} isSad={isSad} />
        {isCelebrating ? (
          <g className="hero-mouth-laugh" style={{ animationDelay: '0.24s' }}>
            <path d="M 314 76 Q 327 94 340 76 Z" fill="#141414" />
            <path d="M 318 84 Q 327 79 336 84 Q 327 90 318 84 Z" fill="#ff6b8b" />
          </g>
        ) : isSad ? (
          <path d="M 314 86 Q 327 73 340 86" stroke="#141414" strokeWidth="4" fill="none" strokeLinecap="round" />
        ) : (
          <rect x="314" y="80" width="26" height="4" rx="2" fill="#141414" />
        )}
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Login Form (Google OAuth Popup Modal with Animated Hand-off)
// ---------------------------------------------------------------------------

interface LoginFormProps {
  onMoodChange: (mood: 'idle' | 'sad') => void;
  onAuthSuccess: () => void;
  isBusy: boolean;
}

function LoginForm({ onMoodChange, onAuthSuccess, isBusy }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorCode = searchParams?.get('error') || null;
  const authError = resolveAuthError(errorCode);

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isErrorDismissed, setIsErrorDismissed] = useState(false);
  const [localAuthError, setLocalAuthError] = useState<AuthErrorInfo | null>(null);

  const visibleAuthError = localAuthError || (!isErrorDismissed ? authError : null);

  useEffect(() => {
    if (visibleAuthError) {
      onMoodChange('sad');
    } else {
      onMoodChange('idle');
    }
  }, [visibleAuthError, onMoodChange]);

  const clearUrlError = useCallback(() => {
    setLocalAuthError(null);
    setIsErrorDismissed(true);
    onMoodChange('idle');
    if (errorCode) {
      router.replace('/login');
    }
  }, [errorCode, onMoodChange, router]);

  const handleGoogleSignIn = async () => {
    if (isBusy || isSigningIn) return;
    setLocalAuthError(null);
    clearUrlError();
    setIsSigningIn(true);
    onMoodChange('idle');

    // Calculate center coordinates for Google OAuth popup modal
    const width = 500;
    const height = 650;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    // Open popup synchronously on click
    const popup = window.open(
      'about:blank',
      'google_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    if (popup) {
      try {
        popup.document.write(`
          <!DOCTYPE html>
          <html>
            <head><title>Connecting to Google...</title></head>
            <body style="margin:0;display:flex;height:100vh;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#ffffff;color:#333;">
              <div style="text-align:center;">
                <div style="width:36px;height:36px;border:3px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px;"></div>
                <p style="font-size:13px;font-weight:600;color:#1e293b;margin:0;">Connecting to Google...</p>
              </div>
              <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
            </body>
          </html>
        `);
      } catch {
        // Ignore potential cross-origin notice
      }
    }

    try {
      // 1. Fetch CSRF token from NextAuth
      const csrfRes = await fetch('/api/auth/csrf');
      const { csrfToken } = await csrfRes.json();

      // 2. Obtain Google authorization URL directly
      const signinRes = await fetch('/api/auth/signin/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          csrfToken,
          callbackUrl: `${window.location.origin}/login?popup=1`,
          json: 'true',
        }),
      });

      const signinData = await signinRes.json();
      const authUrl = signinData?.url;

      if (!authUrl) {
        if (popup && !popup.closed) popup.close();
        throw new Error('Failed to obtain Google authorization URL');
      }

      if (popup && !popup.closed) {
        popup.location.href = authUrl;
        popup.focus();
      } else {
        window.location.href = authUrl;
        return;
      }

      let isFinished = false;

      const cleanupListeners = () => {
        isFinished = true;
        if (bc) {
          try {
            bc.close();
          } catch {}
        }
        window.removeEventListener('message', handleMessage);
        window.removeEventListener('storage', handleStorage);
        clearInterval(pollTimer);
      };

      const handleAuthResult = (data: { type: string; error?: string }) => {
        if (isFinished) return;
        cleanupListeners();
        if (popup && !popup.closed) popup.close();

        if (data.type === 'OAUTH_SUCCESS') {
          setIsSigningIn(false);
          onAuthSuccess();
        } else if (data.type === 'OAUTH_ERROR') {
          setIsSigningIn(false);
          onMoodChange('sad');
          const errInfo = resolveAuthError(data.error || null);
          setLocalAuthError(errInfo || AUTH_ERROR_MESSAGES.Default);
        }
      };

      // 1. BroadcastChannel listener (Cross-tab/popup sync)
      let bc: BroadcastChannel | null = null;
      try {
        bc = new BroadcastChannel('deals_google_auth');
        bc.onmessage = (event) => {
          if (event.data) {
            handleAuthResult(event.data);
          }
        };
      } catch {}

      // 2. LocalStorage storage event listener (Fallback)
      const handleStorage = (event: StorageEvent) => {
        if (event.key === 'deals_oauth_result' && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue);
            if (parsed?.msg) {
              handleAuthResult(parsed.msg);
            }
          } catch {}
        }
      };
      window.addEventListener('storage', handleStorage);

      // 3. postMessage listener
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'OAUTH_SUCCESS' || event.data?.type === 'OAUTH_ERROR') {
          handleAuthResult(event.data);
        }
      };
      window.addEventListener('message', handleMessage);

      // 4. Poll in case popup is closed manually by user
      const pollTimer = setInterval(async () => {
        if (popup.closed && !isFinished) {
          cleanupListeners();
          const session = await getSession();
          if (session?.user) {
            setIsSigningIn(false);
            onAuthSuccess();
          } else {
            setIsSigningIn(false);
            onMoodChange('sad');
            setLocalAuthError({
              title: 'Access Restricted / Sign-In Cancelled',
              description:
                'The sign-in window was closed or access was blocked. Deals Portal is restricted to authorized @ics.com.ph accounts only. If your account is unregistered or you need access, please contact IT Support.',
            });
          }
        }
      }, 500);
    } catch (err) {
      console.error('Sign-in error:', err);
      if (popup && !popup.closed) popup.close();
      setIsSigningIn(false);
      onMoodChange('sad');
      setLocalAuthError({
        title: 'Sign-In Error',
        description: 'Unable to start Google authentication. Please try again or contact IT Support.',
      });
    }
  };

  return (
    <div className="flex flex-col w-full px-6 sm:px-12">
      <div className="w-full max-w-sm mx-auto text-left login-scale-in">
        {/* Header */}
        <div className="text-center sm:text-left mb-5">
          <h1 className={`${outfit.className} text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight`}>
            Welcome back
          </h1>
          <p className={`${inter.className} mt-1 text-xs text-zinc-500`}>
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

        {/* Login Action: Direct Google Sign In Button */}
        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={isBusy || isSigningIn}
            className="group relative flex items-center justify-center w-full px-4 py-3.5 bg-white hover:bg-zinc-50/80 active:bg-zinc-100 text-zinc-700 hover:text-zinc-900 border border-zinc-300 hover:border-zinc-400 rounded-2xl font-medium text-sm transition-all duration-150 shadow-xs hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="absolute left-4 flex items-center justify-center">
              {isSigningIn ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              ) : (
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
              )}
            </div>
            <span className="font-semibold tracking-tight">
              {isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}
            </span>
          </button>

          <p className="text-center text-[11px] text-zinc-400">
            Sign in with your verified <span className="font-medium text-zinc-600">@ics.com.ph</span> corporate account
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Shell: Seamless Multi-Step Animation Flow
// ---------------------------------------------------------------------------

type AnimationStep = 'idle' | 'celebrating' | 'expanding' | 'loading';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [animationStep, setAnimationStep] = useState<AnimationStep>('idle');
  const [characterMood, setCharacterMood] = useState<'idle' | 'sad'>('idle');
  const [loadingStatus, setLoadingStatus] = useState<string>('Preparing your Deals Workspace...');
  const queryClient = useQueryClient();

  // If loaded inside the OAuth popup window, immediately communicate with opener and close
  const [isInsidePopup, setIsInsidePopup] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isPopup =
        window.name === 'google_oauth_popup' ||
        Boolean(window.opener && window.opener !== window) ||
        searchParams?.get('popup') === '1' ||
        (Boolean(searchParams?.get('error')) && window.name === 'google_oauth_popup');

      if (isPopup) {
        setIsInsidePopup(true);
        const error = searchParams?.get('error');
        const msg = error ? { type: 'OAUTH_ERROR', error } : { type: 'OAUTH_SUCCESS' };

        // 1. BroadcastChannel (Reliable cross-window sync)
        try {
          const bc = new BroadcastChannel('deals_google_auth');
          bc.postMessage(msg);
          bc.close();
        } catch {}

        // 2. localStorage fallback
        try {
          localStorage.setItem('deals_oauth_result', JSON.stringify({ msg, t: Date.now() }));
        } catch {}

        // 3. postMessage fallback
        try {
          if (window.opener && window.opener !== window) {
            window.opener.postMessage(msg, window.location.origin);
          }
        } catch {}

        // Immediately close popup window
        window.close();
        setTimeout(() => {
          window.close();
        }, 50);
      }
    }
  }, [searchParams]);

  // Prefetch main navigation routes on mount
  useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/deals');
    router.prefetch('/reports');
    router.prefetch('/deals/new');
  }, [router]);

  // Trigger celebration animation and data prewarming on successful authentication
  const handleAuthSuccess = useCallback(async () => {
    setAnimationStep('celebrating');

    // 1. Prefetch Next.js route chunks immediately
    router.prefetch('/dashboard');
    router.prefetch('/deals');
    router.prefetch('/reports');
    router.prefetch('/deals/new');

    // 2. Transition smoothly to loading state after brief celebration
    setTimeout(async () => {
      setAnimationStep('loading');
      setLoadingStatus('Authenticating session...');

      try {
        // Fetch fresh authenticated session
        const session = await getSession();
        const role = (session?.user as any)?.role || 'admin';
        const accountName = (session?.user as any)?.AccountName || session?.user?.name;
        const accountGroup = (session?.user as any)?.AccountGroup;

        const scopedFilter = {
          userRole: role,
          accountName: accountName || undefined,
          accountGroup: accountGroup || undefined,
        };

        setLoadingStatus('Pre-loading dashboard metrics & deals...');

        // Pre-warm TanStack Query caches with exact scoped keys
        await Promise.allSettled([
          queryClient.prefetchQuery({
            queryKey: DEAL_QUERY_KEYS.dashboard(),
            queryFn: async () => {
              const res = await getDashboardSummary();
              return res.data || null;
            },
            staleTime: 1000 * 60 * 5,
          }),
          queryClient.prefetchQuery({
            queryKey: DEAL_QUERY_KEYS.list(scopedFilter),
            queryFn: async () => {
              const res = await getScopedDeals(scopedFilter);
              return res.data || [];
            },
            staleTime: 1000 * 60 * 5,
          }),
        ]);

        setLoadingStatus('Workspace ready! Redirecting...');
      } catch (e) {
        console.warn('Pre-warming cache warning:', e);
      }

      // Smooth handoff to dashboard
      setTimeout(() => {
        router.replace('/dashboard');
      }, 400);
    }, 1200);
  }, [router, queryClient]);

  const isExpanded = animationStep === 'expanding' || animationStep === 'loading';
  const isCelebrating = animationStep === 'celebrating';
  const isSad = characterMood === 'sad' && !isCelebrating;
  const isLoading = animationStep === 'loading';

  // If this window is the popup, render nothing (it will close instantly)
  if (isInsidePopup) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs font-semibold text-zinc-600">Completing sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-light-scope relative flex min-h-screen bg-[#f8f9fa] overflow-hidden selection:bg-pink-300/50">
      {/* Left White Panel */}
      <div
        className={`login-panel-expand relative flex flex-col min-h-screen bg-white z-20 ${
          isExpanded
            ? 'w-full absolute inset-0 z-40'
            : 'w-full lg:w-[45%]'
        }`}
      >
        {/* Polished Black-and-White Loading State */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white login-fade-in">
            <div className="flex flex-col items-center max-w-sm text-center">
              <div className="relative flex items-center justify-center mb-6">
                <div className="w-12 h-12 border-3 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                </div>
              </div>
              <h3 className={`${outfit.className} text-xl font-bold text-zinc-900 tracking-tight`}>
                Signing In
              </h3>
              <p className={`${inter.className} text-xs font-medium text-zinc-500 mt-1.5 transition-all duration-200`}>
                {loadingStatus}
              </p>
              <div className="w-48 h-1 bg-zinc-100 rounded-full overflow-hidden mt-5">
                <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Brand Header */}
            <header className="flex items-center gap-2.5 px-8 sm:px-10 pt-7 pb-3">
              <div className="p-1.5 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 shadow-sm">
                <Fingerprint className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
              <span className={`${outfit.className} text-lg font-bold text-zinc-900 tracking-tight`}>
                Deals Portal
              </span>
            </header>

            {/* Mobile Character Hero Banner (Visible on mobile screens < lg) */}
            <div
              className="lg:hidden relative w-full overflow-hidden flex flex-col items-center justify-between pt-6 sm:pt-8 pb-0 shrink-0 shadow-xs border-y border-purple-300/40"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.04) 45%, transparent 100%), linear-gradient(60deg, #ab47bc, #8e24aa)',
              }}
            >
              {/* Mobile Heading and Subtitle */}
              <div className="px-6 sm:px-10 pt-2 pb-3 text-center z-10">
                <h2 className={`${outfit.className} text-lg sm:text-2xl font-extrabold text-white leading-snug tracking-tight drop-shadow-xs`}>
                  Your deal registrations, managed seamlessly.
                </h2>
                <p className={`${inter.className} mt-1.5 text-xs sm:text-sm text-white/90 leading-relaxed max-w-sm mx-auto`}>
                  Log in to register deals, track pipeline status, and collaborate with your business units. We&apos;re excited to help you streamline your sales workflow!
                </p>
              </div>

              {/* Peeking Characters Banner (Side-by-Side Zoomed In) */}
              <div className="w-full max-w-[420px] sm:max-w-[460px] h-36 sm:h-44 flex items-end justify-center relative px-2">
                <MobileHeroShapes isCelebrating={isCelebrating} isSad={isSad} />
              </div>
            </div>

            <main className="flex-1 flex flex-col justify-start lg:justify-center pt-6 sm:pt-8 pb-8">
              <Suspense
                fallback={
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
                  </div>
                }
              >
                <LoginForm
                  onMoodChange={setCharacterMood}
                  onAuthSuccess={handleAuthSuccess}
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

      {/* Right Gradient Hero Panel with 4 Animated Characters */}
      <div
        className="relative hidden lg:flex flex-1 flex-col overflow-hidden transition-opacity duration-500"
        style={{
          background:
            'linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.04) 45%, transparent 100%), linear-gradient(60deg, #ab47bc, #8e24aa)',
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
export default function LoginPage() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if (typeof window !== 'undefined') {
              var isPop = (window.name === 'google_oauth_popup') || (window.opener && window.opener !== window) || (window.location.search.indexOf('popup=1') !== -1) || (window.location.search.indexOf('error=') !== -1 && window.name === 'google_oauth_popup');
              if (isPop) {
                document.documentElement.style.display = 'none';
                var p = new URLSearchParams(window.location.search);
                var err = p.get('error');
                var m = err ? { type: 'OAUTH_ERROR', error: err } : { type: 'OAUTH_SUCCESS' };
                try { var b = new BroadcastChannel('deals_google_auth'); b.postMessage(m); b.close(); } catch(e){}
                try { localStorage.setItem('deals_oauth_result', JSON.stringify({ msg: m, t: Date.now() })); } catch(e){}
                try { if (window.opener && window.opener !== window) window.opener.postMessage(m, window.location.origin); } catch(e){}
                window.close();
              }
            }
          `,
        }}
      />
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-white p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-8 h-8 border-3 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
              <p className="text-xs font-semibold text-zinc-500">Loading Deals Portal...</p>
            </div>
          </div>
        }
      >
        <LoginContent />
      </Suspense>
    </>
  );
}
