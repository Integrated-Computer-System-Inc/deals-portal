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
  CheckCircle2,
} from 'lucide-react';
import { Inter, Outfit } from 'next/font/google';
import { cn } from '@/components/utils/cn';

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
// Proport Interactive Characters (Right gradient panel)
// Pure HTML/CSS characters with pupil tracking, blinking, click physics, and scaling.
// ---------------------------------------------------------------------------

function Eye({
  className,
  pupilClassName,
  maxOffset = 9,
  blinkDelay,
  disableBlink = false,
  isSad = false,
}: {
  className?: string;
  pupilClassName?: string;
  maxOffset?: number;
  blinkDelay?: string;
  disableBlink?: boolean;
  isSad?: boolean;
}) {
  const eyeRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!eyeRef.current) return;
      const rect = eyeRef.current.getBoundingClientRect();
      const eyeCenterX = rect.left + rect.width / 2;
      const eyeCenterY = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - eyeCenterY, e.clientX - eyeCenterX);
      const dist = Math.hypot(e.clientX - eyeCenterX, e.clientY - eyeCenterY);
      const moveDist = Math.min(maxOffset, dist / 15);
      setOffset({
        x: Math.cos(angle) * moveDist,
        y: isSad ? maxOffset * 0.7 : Math.sin(angle) * moveDist,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [maxOffset, isSad]);

  return (
    <div
      ref={eyeRef}
      className={cn(
        "w-14 h-14 rounded-full bg-white border-2 border-[#1e1b18] flex items-center justify-center relative overflow-hidden shrink-0 shadow-sm",
        !disableBlink && "eye-blink",
        className
      )}
      style={{
        ...(blinkDelay ? { animationDelay: blinkDelay } : {})
      }}
    >
      <div
        className={cn("w-6 h-6 rounded-full bg-[#1e1b18] absolute", pupilClassName)}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          transition: 'transform 0.05s ease-out',
        }}
      />
    </div>
  );
}

type ClickedChar = 'blue' | 'black' | 'orange' | 'yellow' | null;

function InteractiveCharacters({
  isCelebrating = false,
  isSad = false,
}: {
  isCelebrating?: boolean;
  isSad?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [clicked, setClicked] = useState<ClickedChar>(null);

  const handleCharClick = useCallback((char: NonNullable<ClickedChar>) => {
    setClicked(null);
    requestAnimationFrame(() => setClicked(char));
  }, []);

  useEffect(() => {
    if (!clicked) return;
    const timer = setTimeout(() => setClicked(null), 600);
    return () => clearTimeout(timer);
  }, [clicked]);

  useEffect(() => {
    if (!containerRef.current) return;
    const parent = containerRef.current.parentElement;
    if (!parent) return;

    const handleResize = () => {
      const parentWidth = parent.clientWidth;
      const baseWidth = 620;
      const computedScale = Math.min(parentWidth / baseWidth, 1.15);
      setScale(computedScale);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(parent);
    handleResize();

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-0 left-0 right-0 h-[440px] flex items-end justify-center select-none overflow-visible pointer-events-none"
    >
      <div
        className="w-[600px] h-[440px] relative origin-bottom shrink-0 pointer-events-auto"
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Blue Rectangle */}
        <div
          onClick={() => handleCharClick('blue')}
          className={cn(
            "absolute left-[170px] bottom-0 w-[200px] h-[400px] bg-[#4f46e5] rounded-t-sm flex flex-col items-center pt-20 z-10 transition-all duration-300 origin-bottom cursor-pointer",
            clicked === 'blue' ? "clicked-blue" : isCelebrating ? "hero-celebrate-0" : isSad ? "hero-sad-slump" : ""
          )}
        >
          <div className="flex gap-12">
            <Eye maxOffset={isCelebrating ? 12 : 9} blinkDelay="0s" isSad={isSad} />
            <Eye maxOffset={isCelebrating ? 12 : 9} blinkDelay="0s" isSad={isSad} />
          </div>
          {isCelebrating ? (
            <div className="w-8 h-8 rounded-full bg-[#1e1b18] mt-8 transition-all duration-300 animate-bounce" />
          ) : isSad ? (
            <div className="w-10 h-2 border-t-4 border-t-[#1e1b18] border-b-0 border-x-0 rounded-full mt-8" />
          ) : (
            <div className="w-10 h-2 border-b-4 border-b-[#1e1b18] border-t-0 border-x-0 rounded-full mt-8" />
          )}
        </div>

        {/* Black Rectangle */}
        <div
          onClick={() => handleCharClick('black')}
          className={cn(
            "absolute left-[330px] bottom-0 w-[110px] h-[320px] bg-[#1e1b18] rounded-t-sm flex flex-col items-center pt-16 z-20 transition-all duration-300 origin-bottom cursor-pointer",
            clicked === 'black' ? "clicked-black" : isCelebrating ? "hero-celebrate-1" : isSad ? "hero-sad-slump" : ""
          )}
        >
          <div className="flex gap-1">
            <Eye maxOffset={isCelebrating ? 12 : 9} blinkDelay="1.8s" isSad={isSad} />
            <Eye maxOffset={isCelebrating ? 12 : 9} blinkDelay="1.8s" isSad={isSad} />
          </div>
          <div className={cn(
            "flex gap-10 mt-4 transition-opacity duration-300",
            isCelebrating || clicked === 'black' ? "opacity-100" : "opacity-0"
          )}>
            <div className="w-4 h-2 bg-[#f43f5e] rounded-full opacity-60" />
            <div className="w-4 h-2 bg-[#f43f5e] rounded-full opacity-60" />
          </div>
        </div>

        {/* Orange Semicircle */}
        <div
          onClick={() => handleCharClick('orange')}
          className={cn(
            "absolute left-[50px] bottom-0 w-[360px] h-[180px] bg-[#f97316] rounded-t-full flex flex-col items-center pt-12 z-30 shadow-md transition-all duration-300 origin-bottom cursor-pointer",
            clicked === 'orange' ? "clicked-orange" : isCelebrating ? "hero-celebrate-3" : isSad ? "hero-sad-slump" : ""
          )}
        >
          <div className="flex gap-20 mb-4">
            <Eye maxOffset={isCelebrating ? 12 : 9} blinkDelay="3.4s" isSad={isSad} />
            <Eye maxOffset={isCelebrating ? 12 : 9} blinkDelay="3.4s" isSad={isSad} />
          </div>
          {isCelebrating ? (
            <div className="w-12 h-12 bg-[#1e1b18] rounded-full mt-1 transition-all duration-300 animate-pulse" />
          ) : isSad ? (
            <div className="w-12 h-6 bg-[#1e1b18] rounded-t-full" />
          ) : (
            <div className="w-12 h-6 bg-[#1e1b18] rounded-b-full" />
          )}
        </div>

        {/* Yellow Pill Shape */}
        <div
          onClick={() => handleCharClick('yellow')}
          className={cn(
            "absolute left-[410px] bottom-0 w-[160px] h-[240px] bg-[#facc15] rounded-t-full flex flex-col items-end pr-10 pt-20 z-40 transition-all duration-300 origin-bottom cursor-pointer",
            clicked === 'yellow' ? "clicked-yellow" : isCelebrating ? "hero-celebrate-2" : isSad ? "hero-sad-slump" : ""
          )}
        >
          <Eye maxOffset={isCelebrating ? 12 : 9} className="mr-1" blinkDelay="2.5s" isSad={isSad} />
          {isCelebrating ? (
            <div className="w-10 h-5 bg-transparent border-b-4 border-b-[#1e1b18] border-t-0 border-x-0 rounded-b-full mt-3 mr-2 transition-all duration-300" />
          ) : isSad ? (
            <div className="w-10 h-3 border-t-4 border-t-[#1e1b18] border-b-0 border-x-0 rounded-t-full mt-4 mr-2" />
          ) : (
            <div className="w-16 h-1.5 bg-[#1e1b18] mt-4 mr-1" />
          )}
        </div>
      </div>
    </div>
  );
}

function MobileInteractiveCharacters({
  isCelebrating = false,
  isSad = false,
}: {
  isCelebrating?: boolean;
  isSad?: boolean;
}) {
  return (
    <div className="w-[360px] h-[145px] relative origin-bottom scale-[0.62] sm:scale-[0.75] shrink-0 pointer-events-auto">
      {/* Blue */}
      <div
        className={cn(
          "absolute left-[100px] bottom-0 w-[120px] h-[240px] bg-[#4f46e5] rounded-t-sm flex flex-col items-center pt-8 z-10",
          isCelebrating ? "hero-celebrate-0" : isSad ? "hero-sad-slump" : ""
        )}
      >
        <div className="flex gap-6">
          <Eye maxOffset={6} blinkDelay="0s" isSad={isSad} className="!w-9 !h-9 border" pupilClassName="!w-4 !h-4" />
          <Eye maxOffset={6} blinkDelay="0s" isSad={isSad} className="!w-9 !h-9 border" pupilClassName="!w-4 !h-4" />
        </div>
        <div className="w-6 h-1.5 border-b-2 border-b-[#1e1b18] rounded-full mt-4" />
      </div>

      {/* Black */}
      <div
        className={cn(
          "absolute left-[200px] bottom-0 w-[70px] h-[190px] bg-[#1e1b18] rounded-t-sm flex flex-col items-center pt-6 z-20",
          isCelebrating ? "hero-celebrate-1" : isSad ? "hero-sad-slump" : ""
        )}
      >
        <div className="flex gap-1">
          <Eye maxOffset={6} blinkDelay="1.8s" isSad={isSad} className="!w-7 !h-7 border" pupilClassName="!w-3 !h-3" />
          <Eye maxOffset={6} blinkDelay="1.8s" isSad={isSad} className="!w-7 !h-7 border" pupilClassName="!w-3 !h-3" />
        </div>
        <div className="flex gap-4 mt-2">
          <div className="w-2.5 h-1.5 bg-[#f43f5e] rounded-full opacity-60" />
          <div className="w-2.5 h-1.5 bg-[#f43f5e] rounded-full opacity-60" />
        </div>
      </div>

      {/* Orange */}
      <div
        className={cn(
          "absolute left-[25px] bottom-0 w-[220px] h-[110px] bg-[#f97316] rounded-t-full flex flex-col items-center pt-6 z-30 shadow-md",
          isCelebrating ? "hero-celebrate-3" : isSad ? "hero-sad-slump" : ""
        )}
      >
        <div className="flex gap-12 mb-2">
          <Eye maxOffset={6} blinkDelay="3.4s" isSad={isSad} className="!w-9 !h-9 border" pupilClassName="!w-4 !h-4" />
          <Eye maxOffset={6} blinkDelay="3.4s" isSad={isSad} className="!w-9 !h-9 border" pupilClassName="!w-4 !h-4" />
        </div>
        <div className="w-8 h-4 bg-[#1e1b18] rounded-b-full" />
      </div>

      {/* Yellow */}
      <div
        className={cn(
          "absolute left-[245px] bottom-0 w-[100px] h-[150px] bg-[#facc15] rounded-t-full flex flex-col items-end pr-5 pt-8 z-40",
          isCelebrating ? "hero-celebrate-2" : isSad ? "hero-sad-slump" : ""
        )}
      >
        <Eye maxOffset={6} className="!w-8 !h-8 border mr-1" pupilClassName="!w-3.5 !h-3.5" blinkDelay="2.5s" isSad={isSad} />
        <div className="w-10 h-1 bg-[#1e1b18] mt-2 mr-1" />
      </div>
    </div>
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
        clearInterval(sessionPollTimer);
        clearTimeout(timeoutTimer);
      };

      const handleAuthResult = (data: { type: string; error?: string }) => {
        if (isFinished) return;
        cleanupListeners();
        if (popup && !popup.closed) {
          try { popup.close(); } catch {}
        }

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

      // 4. Active Session Polling Fallback: Detects when NextAuth cookie/session is set on server
      // Runs every 1 second — bypasses any cross-window messaging or window.close() blocks
      const sessionPollTimer = setInterval(async () => {
        if (isFinished) return;
        try {
          const session = await getSession();
          if (session?.user) {
            handleAuthResult({ type: 'OAUTH_SUCCESS' });
          }
        } catch {}
      }, 1000);

      // 5. Poll in case popup is closed manually by user
      const pollTimer = setInterval(async () => {
        if (isFinished) return;
        let isClosed = false;
        try {
          isClosed = Boolean(popup.closed);
        } catch {
          // Cross-origin restriction
        }
        if (isClosed) {
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

      // 6. Timeout Safety Net: Prevents infinite hanging spinner if network stalls
      const timeoutTimer = setTimeout(async () => {
        if (isFinished) return;
        try {
          const session = await getSession();
          if (session?.user) {
            handleAuthResult({ type: 'OAUTH_SUCCESS' });
            return;
          }
        } catch {}
        cleanupListeners();
        if (popup && !popup.closed) {
          try { popup.close(); } catch {}
        }
        setIsSigningIn(false);
        onMoodChange('sad');
        setLocalAuthError({
          title: 'Sign-In Timed Out',
          description: 'Authentication took longer than expected. Please click Sign in with Google to try again.',
        });
      }, 60000);
    } catch (err) {
      console.error('Sign-in error:', err);
      if (popup && !popup.closed) {
        try { popup.close(); } catch {}
      }
      setIsSigningIn(false);
      onMoodChange('sad');
      setLocalAuthError({
        title: 'Sign-In Error',
        description: 'Unable to start Google authentication. Please try again or contact IT Support.',
      });
    }
  };

  return (
    <div className="flex flex-col w-full px-4 sm:px-6">
      <div className="w-full max-w-[420px] mx-auto text-center login-scale-in">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className={`${outfit.className} text-[32px] sm:text-[34px] font-bold text-[#1e1b18] tracking-tight mb-2.5`}>
            Welcome back
          </h1>
          <p className={`${inter.className} text-sm md:text-base text-[#1e1b18]/65 font-medium`}>
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
        <div className="w-full flex flex-col items-center justify-center gap-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={isBusy || isSigningIn}
            className="group relative flex items-center justify-center w-full max-w-[380px] px-4 py-3.5 bg-white hover:bg-zinc-50/80 active:bg-zinc-100 text-zinc-700 hover:text-zinc-900 border border-zinc-300 hover:border-zinc-400 rounded-2xl font-medium text-sm transition-all duration-150 shadow-xs hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
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

          <p className="text-center text-[12px] text-zinc-400 font-medium">
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
          setTimeout(() => {
            try {
              bc.postMessage(msg);
              bc.close();
            } catch {}
          }, 100);
        } catch {}

        // 2. localStorage fallback
        try {
          localStorage.setItem('deals_oauth_result', JSON.stringify({ msg, t: Date.now() }));
        } catch {}

        // 3. postMessage fallback
        try {
          if (window.opener && window.opener !== window) {
            window.opener.postMessage(msg, window.location.origin);
            window.opener.postMessage(msg, '*');
          }
        } catch {}

        // Attempt closing popup with graceful retries
        try {
          window.close();
        } catch {}
        setTimeout(() => {
          try {
            window.close();
          } catch {}
        }, 150);
        setTimeout(() => {
          try {
            window.close();
          } catch {}
        }, 500);
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

  // Trigger celebration animation and smooth loading screen handoff to dashboard
  const handleAuthSuccess = useCallback(() => {
    setAnimationStep('celebrating');

    // 1. Prefetch Next.js route chunks immediately
    router.prefetch('/dashboard');
    router.prefetch('/deals');
    router.prefetch('/reports');
    router.prefetch('/deals/new');

    // 2. Start prewarming session and data in parallel
    const prewarmData = (async () => {
      try {
        const session = await getSession();
        const role = (session?.user as any)?.role || 'admin';
        const accountName = (session?.user as any)?.AccountName || session?.user?.name;
        const accountGroup = (session?.user as any)?.AccountGroup;

        const scopedFilter = {
          userRole: role,
          accountName: accountName || undefined,
          accountGroup: accountGroup || undefined,
        };

        const defaultDealsFilter = {
          ...scopedFilter,
          sortBy: 'dtRegistered',
          sortOrder: 'desc' as const,
          page: 1,
          pageSize: 50,
        };

        await Promise.allSettled([
          queryClient.fetchQuery({
            queryKey: DEAL_QUERY_KEYS.dashboard(),
            queryFn: async () => {
              const res = await getDashboardSummary();
              return res.data || null;
            },
            staleTime: 1000 * 60 * 5,
          }),
          queryClient.fetchQuery({
            queryKey: DEAL_QUERY_KEYS.list(scopedFilter),
            queryFn: async () => {
              const res = await getScopedDeals(scopedFilter);
              return res.data || [];
            },
            staleTime: 1000 * 60 * 5,
          }),
          queryClient.fetchQuery({
            queryKey: DEAL_QUERY_KEYS.list(defaultDealsFilter),
            queryFn: async () => {
              const res = await getScopedDeals(defaultDealsFilter);
              return {
                data: Array.isArray(res.data) ? res.data : [],
                totalCount: res.totalCount || 0,
                page: 1,
                pageSize: 50,
                totalPages: res.totalPages || 1,
              };
            },
            staleTime: 1000 * 60 * 5,
          }),
        ]);
      } catch (err) {
        console.warn('[Login Prewarm] Notice:', err);
      }
    })();

    // 3. Smooth sequence:
    // Step 1: Smoothly animate the right panel minimize / left panel expansion immediately
    setAnimationStep('expanding');

    // Step 2: Transition into full loading screen while prewarming completes
    setTimeout(async () => {
      setAnimationStep('loading');
      setLoadingStatus('Preparing your Deals Workspace...');

      // Wait until all queries are completely fetched and written to cache
      await prewarmData;

      setLoadingStatus('Entering Deals Portal...');
      setTimeout(() => {
        router.replace('/dashboard');
      }, 200);
    }, 600);
  }, [router, queryClient]);

  const isExpanded = animationStep === 'expanding' || animationStep === 'loading';
  const isCelebrating = animationStep === 'celebrating' || animationStep === 'expanding' || animationStep === 'loading';
  const isSad = characterMood === 'sad' && !isCelebrating;
  const isLoading = animationStep === 'loading';

  // If this window is the popup, display completion state & manual close button if browser blocks window.close()
  if (isInsidePopup) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center">
        <div className="flex flex-col items-center max-w-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className={`${outfit.className} text-base font-bold text-zinc-900`}>
            Authentication Successful
          </h2>
          <p className={`${inter.className} text-xs text-zinc-500 mt-1`}>
            You may return to the Deals Portal tab.
          </p>
          <button
            onClick={() => window.close()}
            className="mt-4 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="login-light-scope relative flex min-h-screen bg-[#ffffff] overflow-hidden selection:bg-purple-300/50">
      {/* Left White Panel */}
      <div
        className={`login-panel-expand relative flex flex-col justify-between p-8 sm:p-12 z-20 bg-white min-h-screen ${
          isExpanded
            ? 'w-full absolute inset-0 z-40'
            : 'w-full md:w-1/2 lg:w-[45%]'
        }`}
      >
        {/* Polished Loading State */}
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
            <div>
              <header className="flex items-center gap-2 group w-max">
                <div className="p-1.5 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 shadow-sm">
                  <Fingerprint className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <span className={`${outfit.className} text-lg md:text-xl font-bold text-[#1e1b18] tracking-tight`}>
                  Deals Portal
                </span>
              </header>
            </div>

            {/* Mobile Character Hero Banner (Visible on mobile screens < md) */}
            <div
              className="md:hidden relative w-full overflow-hidden flex flex-col items-center justify-between pt-6 sm:pt-8 pb-0 shrink-0 shadow-xs border-y border-purple-300/40 my-4 rounded-2xl"
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

              {/* Peeking Characters Banner */}
              <div className="w-full max-w-[420px] sm:max-w-[460px] h-36 sm:h-44 flex items-end justify-center relative px-2">
                <MobileInteractiveCharacters isCelebrating={isCelebrating} isSad={isSad} />
              </div>
            </div>

            <main className="flex-1 flex flex-col justify-center items-center py-4">
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
            <footer className="flex justify-between items-center text-[13px] text-[#1e1b18]/50 font-medium">
              <span>Copyright © {new Date().getFullYear()} ICS</span>
              <a href="#" className="text-[13px] text-[#1e1b18]/80 hover:text-[#1e1b18] font-semibold transition-colors">
                Privacy Policy
              </a>
            </footer>
          </>
        )}
      </div>

      {/* Right Gradient Hero Panel with 4 Animated Characters */}
      <div
        className="relative hidden md:flex w-1/2 lg:w-[55%] text-white overflow-hidden flex-col justify-between pt-16 pb-0 px-12 lg:px-24 transition-opacity duration-500"
        style={{
          background:
            'linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.04) 45%, transparent 100%), linear-gradient(60deg, #ab47bc, #8e24aa)',
        }}
      >
        <div />

        <div className="relative z-10 w-full max-w-xl select-none">
          <h2 className={`${outfit.className} mb-6 leading-[1.2] tracking-tight text-white text-[42px] lg:text-[48px] font-black`}>
            Your deal registrations, managed seamlessly.
          </h2>
          <p className={`${inter.className} text-white/80 leading-relaxed mb-12 text-[18px] lg:text-[20px] font-semibold`}>
            Log in to register deals, track pipeline status, and collaborate with your business
            units. We&apos;re excited to help you streamline your sales workflow!
          </p>
        </div>

        <div className="relative w-full h-[460px] flex items-end justify-center">
          <InteractiveCharacters isCelebrating={isCelebrating} isSad={isSad} />
        </div>
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
              var isPop = (window.name === 'google_oauth_popup') || 
                          (window.opener && window.opener !== window) || 
                          (window.location.search.indexOf('popup=1') !== -1) || 
                          (window.location.search.indexOf('error=') !== -1 && window.name === 'google_oauth_popup');
              if (isPop) {
                var p = new URLSearchParams(window.location.search);
                var err = p.get('error');
                var m = err ? { type: 'OAUTH_ERROR', error: err } : { type: 'OAUTH_SUCCESS' };
                try { var b = new BroadcastChannel('deals_google_auth'); b.postMessage(m); } catch(e){}
                try { localStorage.setItem('deals_oauth_result', JSON.stringify({ msg: m, t: Date.now() })); } catch(e){}
                try { 
                  if (window.opener && window.opener !== window) { 
                    window.opener.postMessage(m, window.location.origin);
                    window.opener.postMessage(m, '*');
                  } 
                } catch(e){}
                try { window.close(); } catch(e){}
                setTimeout(function() { try { window.close(); } catch(e){} }, 200);
                setTimeout(function() { try { window.close(); } catch(e){} }, 600);
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

