'use client';

import { getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  ShieldAlert,
  Loader2,
  Fingerprint,
  X,
  Info,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { Inter, Outfit } from 'next/font/google';
import { cn } from '@/components/utils/cn';
import { PrivacyModal } from './privacy-modal';

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
      'Access restricted: Only Account Officers (AO), BU Heads, Product Managers (PM), Admin Assistants (AA), and Administrators are authorized to access the Deals Portal. If your account is unregistered or inactive, please contact IT Support.',
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
// Eye component (pupil tracking + blinking)
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
        'w-14 h-14 rounded-full bg-white border-2 border-[#1e1b18] flex items-center justify-center relative overflow-hidden shrink-0 shadow-sm',
        !disableBlink && 'eye-blink',
        className,
      )}
      style={{ ...(blinkDelay ? { animationDelay: blinkDelay } : {}) }}
    >
      <div
        className={cn('w-6 h-6 rounded-full bg-[#1e1b18] absolute', pupilClassName)}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, transition: 'transform 0.05s ease-out' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gary Hero Mascot (desktop)
// ---------------------------------------------------------------------------

function GaryHeroMascot({
  isCelebrating = false,
  isSad = false,
  isMinimized = false,
}: {
  isCelebrating?: boolean;
  isSad?: boolean;
  isMinimized?: boolean;
}) {
  const sadVideoRef = useRef<HTMLVideoElement>(null);
  const welcomeVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isCelebrating) {
      welcomeVideoRef.current?.pause();
      sadVideoRef.current?.pause();
      return;
    }
    if (isSad) {
      welcomeVideoRef.current?.pause();
      if (sadVideoRef.current) {
        sadVideoRef.current.muted = true;
        sadVideoRef.current.currentTime = 0;
        const p = sadVideoRef.current.play();
        if (p !== undefined) p.catch(() => {});
      }
    } else {
      sadVideoRef.current?.pause();
      if (welcomeVideoRef.current) {
        welcomeVideoRef.current.muted = true;
        const p = welcomeVideoRef.current.play();
        if (p !== undefined) p.catch(() => {});
      }
    }
  }, [isCelebrating, isSad]);

  if (isCelebrating) {
    return (
      <div key="hero-celebrating" className="w-full h-full flex items-center justify-center select-none animate-in fade-in zoom-in-95 duration-300">
        <img
          src="/icons/Success_Message.png"
          alt="Login Success"
          className="w-auto max-h-full max-w-full object-contain drop-shadow-2xl"
          onError={(e) => { (e.target as HTMLImageElement).src = '/api/icons/Success_Message.png'; }}
        />
      </div>
    );
  }

  return (
    // Mascot fills the container — h-full drives height, width follows aspect ratio
    <div className="relative w-full h-full flex items-end justify-center select-none">
      <video
        ref={welcomeVideoRef}
        autoPlay loop muted playsInline preload="auto"
        className={`w-auto h-full object-contain object-bottom drop-shadow-2xl transition-opacity duration-200 ease-in-out ${isSad ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ minWidth: '82%' }}
      >
        <source src="/icons/Welcome.webm" type="video/webm" />
        <source src="/api/icons/Welcome.webm" type="video/webm" />
        <source src="/api/icons/Peeking_Welcome.webm" type="video/webm" />
      </video>
      <video
        ref={sadVideoRef}
        autoPlay loop muted playsInline preload="auto"
        className={`absolute bottom-0 w-auto h-full object-contain object-bottom drop-shadow-2xl transition-opacity duration-200 ease-in-out ${isSad ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'}`}
        style={{ minWidth: '82%' }}
      >
        <source src="/icons/Failed_Login.webm" type="video/webm" />
        <source src="/icons/Failed_Login.mp4" type="video/mp4" />
        <source src="/api/icons/Failed_Login.webm" type="video/webm" />
      </video>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gary Hero Mascot (mobile)
// ---------------------------------------------------------------------------

function MobileGaryHeroMascot({
  isCelebrating = false,
  isSad = false,
}: {
  isCelebrating?: boolean;
  isSad?: boolean;
}) {
  const mobileSadRef = useRef<HTMLVideoElement>(null);
  const mobileWelcomeRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isCelebrating) {
      mobileWelcomeRef.current?.pause();
      mobileSadRef.current?.pause();
      return;
    }
    if (isSad) {
      mobileWelcomeRef.current?.pause();
      if (mobileSadRef.current) {
        mobileSadRef.current.muted = true;
        mobileSadRef.current.currentTime = 0;
        const p = mobileSadRef.current.play();
        if (p !== undefined) p.catch(() => {});
      }
    } else {
      mobileSadRef.current?.pause();
      if (mobileWelcomeRef.current) {
        mobileWelcomeRef.current.muted = true;
        const p = mobileWelcomeRef.current.play();
        if (p !== undefined) p.catch(() => {});
      }
    }
  }, [isCelebrating, isSad]);

  if (isCelebrating) {
    return (
      <div key="mobile-hero-celebrating" className="relative w-full h-full flex items-center justify-center select-none animate-in fade-in zoom-in-95 duration-300">
        <img
          src="/icons/Success_Message.png"
          alt="Login Success"
          className="w-auto h-full object-contain drop-shadow-lg"
          onError={(e) => { (e.target as HTMLImageElement).src = '/api/icons/Success_Message.png'; }}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-end justify-center select-none">
      <video
        ref={mobileWelcomeRef}
        autoPlay loop muted playsInline preload="auto"
        className={`w-auto h-full object-contain object-bottom drop-shadow-lg transition-opacity duration-200 ease-in-out ${isSad ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ minWidth: '70%' }}
      >
        <source src="/icons/Welcome.webm" type="video/webm" />
        <source src="/api/icons/Welcome.webm" type="video/webm" />
        <source src="/api/icons/Peeking_Welcome.webm" type="video/webm" />
      </video>
      <video
        ref={mobileSadRef}
        autoPlay loop muted playsInline preload="auto"
        className={`absolute bottom-0 w-auto h-full object-contain object-bottom drop-shadow-lg transition-opacity duration-200 ease-in-out ${isSad ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'}`}
        style={{ minWidth: '70%' }}
      >
        <source src="/icons/Failed_Login.webm" type="video/webm" />
        <source src="/icons/Failed_Login.mp4" type="video/mp4" />
        <source src="/api/icons/Failed_Login.webm" type="video/webm" />
      </video>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Login Form
// ---------------------------------------------------------------------------

interface LoginFormProps {
  onMoodChange: (mood: 'idle' | 'sad') => void;
  onAuthSuccess: () => void;
  isBusy: boolean;
  initialCsrfToken?: string | null;
}

function LoginForm({ onMoodChange, onAuthSuccess, isBusy, initialCsrfToken }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorCode = searchParams?.get('error') || null;
  const authError = resolveAuthError(errorCode);

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isErrorDismissed, setIsErrorDismissed] = useState(false);
  const [localAuthError, setLocalAuthError] = useState<AuthErrorInfo | null>(null);
  const [cachedCsrfToken, setCachedCsrfToken] = useState<string | null>(null);

  // Background fetch of the CSRF token directly from the browser so the next-auth.csrf-token cookie
  // is guaranteed stored in the browser's cookie jar before the user clicks sign in
  useEffect(() => {
    const controller = new AbortController();
    const fetchCsrf = async () => {
      try {
        const res = await fetch('/api/auth/csrf', { signal: controller.signal });
        if (!res.ok) return;
        const text = await res.text();
        const data = JSON.parse(text);
        if (data?.csrfToken) setCachedCsrfToken(data.csrfToken);
      } catch {
        // Silently ignore — network errors and AbortError on unmount
      }
    };
    fetchCsrf();
    return () => controller.abort();
  }, []);

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

    // Clear any prior OAuth messages from local storage to prevent stale triggers
    try {
      localStorage.removeItem('deals_oauth_result');
    } catch { }

    const startAuthTime = Date.now();

    const width = 500;
    const height = 650;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    const popup = window.open(
      'about:blank',
      'google_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`,
    );

    if (popup) {
      try {
        popup.document.write(`
          <!DOCTYPE html><html>
          <head><title>Connecting to Google...</title></head>
          <body style="margin:0;display:flex;height:100vh;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#ffffff;color:#333;">
            <div style="text-align:center;">
              <div style="width:36px;height:36px;border:3px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px;"></div>
              <p style="font-size:13px;font-weight:600;color:#1e293b;margin:0;">Connecting to Google...</p>
            </div>
            <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
          </body></html>`);
      } catch { /* cross-origin */ }
    }

    try {
      // Always ensure the browser has a fresh CSRF token and next-auth.csrf-token cookie set
      let csrfToken = cachedCsrfToken;
      try {
        const csrfRes = await fetch('/api/auth/csrf');
        if (csrfRes.ok) {
          const csrfData = await csrfRes.json();
          if (csrfData?.csrfToken) {
            csrfToken = csrfData.csrfToken;
            setCachedCsrfToken(csrfData.csrfToken);
          }
        }
      } catch (e) {
        console.warn('[CSRF Fetch] Notice:', e);
      }

      const signinRes = await fetch('/api/auth/signin/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          csrfToken: csrfToken || '',
          callbackUrl: `${window.location.origin}/api/auth/popup-callback`,
          json: 'true',
        }),
      });

      const signinData = await signinRes.json();
      const authUrl = signinData?.url;

      // Validate that authUrl actually points to Google OAuth and is not a NextAuth CSRF error redirect
      if (!authUrl || authUrl.includes('csrf=true') || !authUrl.includes('google')) {
        if (popup && !popup.closed) popup.close();
        console.error('[Google Sign-In] Invalid authorization URL returned:', authUrl);
        setIsSigningIn(false);
        onMoodChange('sad');
        setLocalAuthError({
          title: 'Sign-In Error',
          description: 'Unable to start Google authentication. Please try again or contact IT Support.',
        });
        return;
      }

      if (popup && popup.closed) {
        setIsSigningIn(false);
        onMoodChange('sad');
        setLocalAuthError({
          title: 'Login Cancelled / Unauthorized Account',
          description: 'Sign-in was cancelled or access was restricted. Deals Portal requires an authorized corporate @ics.com.ph account. If your account is unregistered, please contact IT Support.',
        });
        return;
      }

      if (popup && !popup.closed) {
        try {
          popup.location.href = authUrl;
          popup.focus();
        } catch {
          setIsSigningIn(false);
          onMoodChange('sad');
          setLocalAuthError({
            title: 'Login Cancelled / Unauthorized Account',
            description: 'Sign-in was cancelled or access was restricted. Deals Portal requires an authorized corporate @ics.com.ph account. If your account is unregistered, please contact IT Support.',
          });
          return;
        }
      } else if (!popup) {
        window.location.href = authUrl;
        return;
      }

      let isFinished = false;

      const cleanupListeners = () => {
        isFinished = true;
        try { bc?.close(); } catch { }
        window.removeEventListener('message', handleMessage);
        window.removeEventListener('storage', handleStorage);
        clearInterval(pollTimer);
        clearTimeout(timeoutTimer);
      };

      const handleAuthResult = (data: { type: string; error?: string; t?: number }) => {
        if (isFinished) return;
        // Ignore stale messages from previous attempts
        if (data.t && data.t < startAuthTime) return;

        cleanupListeners();
        if (popup && !popup.closed) { try { popup.close(); } catch { } }

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

      // BroadcastChannel (primary cross-tab sync)
      let bc: BroadcastChannel | null = null;
      try {
        bc = new BroadcastChannel('deals_google_auth');
        bc.onmessage = (event) => { if (event.data) handleAuthResult(event.data); };
      } catch { }

      // localStorage fallback (strictly validated against startAuthTime)
      const handleStorage = (event: StorageEvent) => {
        if (event.key === 'deals_oauth_result' && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue);
            if (parsed?.msg && parsed?.t && parsed.t >= startAuthTime) {
              handleAuthResult({ ...parsed.msg, t: parsed.t });
            }
          } catch { }
        }
      };
      window.addEventListener('storage', handleStorage);

      // postMessage fallback
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'OAUTH_SUCCESS' || event.data?.type === 'OAUTH_ERROR') {
          handleAuthResult(event.data);
        }
      };
      window.addEventListener('message', handleMessage);

      // Popup-closed detection (user cancelled or closed popup before completing auth)
      const pollTimer = setInterval(() => {
        if (isFinished) return;
        let isClosed = false;
        try { isClosed = Boolean(popup?.closed); } catch { }
        if (isClosed) {
          cleanupListeners();
          setIsSigningIn(false);
          onMoodChange('sad');
          setLocalAuthError({
            title: 'Login Cancelled / Interrupted',
            description: 'Sign-in popup was closed before completing authentication. Please click Sign in with Google to try again.',
          });
        }
      }, 100);

      // Timeout safety net
      const timeoutTimer = setTimeout(() => {
        if (isFinished) return;
        cleanupListeners();
        if (popup && !popup.closed) { try { popup.close(); } catch { } }
        setIsSigningIn(false);
        onMoodChange('sad');
        setLocalAuthError({
          title: 'Sign-In Timed Out',
          description: 'Authentication took longer than expected. Please click Sign in with Google to try again.',
        });
      }, 60000);
    } catch (err) {
      console.error('Sign-in error:', err);
      if (popup && !popup.closed) { try { popup.close(); } catch { } }
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
        <div className="text-center mb-7">
          <h1 className={`${outfit.className} text-[34px] font-bold text-[#1e1b18] tracking-tight leading-[1.1] mb-2.5`}>
            Welcome back
          </h1>
          <p className={`${inter.className} text-sm md:text-base text-[#1e1b18]/65 font-medium leading-relaxed`}>
            Sign in to manage deal registrations &amp; pipelines
          </p>
        </div>

        {visibleAuthError && (
          <div
            role="alert"
            aria-live="assertive"
            className="relative flex items-start w-full mb-6 p-4 text-left bg-amber-50 border border-amber-200 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="p-1.5 rounded-lg bg-amber-100 mr-3 mt-0.5 shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 pr-6">
              <p className="text-sm font-bold text-zinc-900">{visibleAuthError.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600">{visibleAuthError.description}</p>
              <div className="mt-2 pt-1.5 border-t border-amber-100 text-[11px] font-semibold text-amber-800 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>Wrong account? Please contact IT if unregistered.</span>
              </div>
            </div>
            <button
              onClick={clearUrlError}
              aria-label="Dismiss error message"
              className="absolute top-3 right-3 p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="w-full flex flex-col items-center justify-center gap-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={isBusy || isSigningIn}
            className={cn(
              'group relative flex items-center justify-center w-full max-w-[380px] gap-3 px-5 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer',
              isSigningIn
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'bg-[#1a73e8] hover:bg-[#1765cc] active:bg-[#1558b0] text-white shadow-md shadow-blue-600/30 hover:shadow-lg hover:shadow-blue-600/35 hover:-translate-y-px active:translate-y-0',
            )}
          >
            <span className="flex items-center justify-center w-5 h-5 shrink-0">
              {isSigningIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center justify-center w-5 h-5 rounded-sm bg-white">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                </span>
              )}
            </span>
            <span className="tracking-tight">
              {isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}
            </span>
          </button>

          <div className="flex items-center gap-1.5 text-[11.5px] text-zinc-400 font-medium">
            <Fingerprint className="w-3.5 h-3.5 text-zinc-400/70 shrink-0" />
            <span>
              Use your verified{' '}
              <span className="font-semibold text-zinc-500">@ics.com.ph</span>{' '}
              corporate account
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Shell: Seamless Multi-Step Animation Flow
// ---------------------------------------------------------------------------

type AnimationStep = 'idle' | 'celebrating' | 'expanding' | 'loading';

const DROMMAR_ACRONYM = [
  { letter: 'D', word: 'Deal' },
  { letter: 'R', word: 'Registration,' },
  { letter: 'O', word: 'Operations,' },
  { letter: 'M', word: 'Management &' },
  { letter: 'M', word: 'Monitoring' },
  { letter: 'A', word: 'Automation' },
  { letter: 'R', word: 'Resource' },
];

function LoginContent({ initialCsrfToken }: { initialCsrfToken?: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [animationStep, setAnimationStep] = useState<AnimationStep>('idle');
  const [characterMood, setCharacterMood] = useState<'idle' | 'sad'>('idle');
  const [loadingStatus, setLoadingStatus] = useState<string>('Preparing your Deals Workspace...');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isAcronymOpen, setIsAcronymOpen] = useState(false);
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
        // A popup landing on /login means authentication was interrupted or redirected.
        // It is NEVER an OAuth success — only /api/auth/popup-callback represents success.
        const msg = {
          type: 'OAUTH_ERROR',
          error: error || 'OAuthCallbackError',
          t: Date.now(),
        };

        try {
          const bc = new BroadcastChannel('deals_google_auth');
          bc.postMessage(msg);
          setTimeout(() => { try { bc.postMessage(msg); bc.close(); } catch { } }, 100);
        } catch { }

        try { localStorage.setItem('deals_oauth_result', JSON.stringify({ msg, t: Date.now() })); } catch { }

        try {
          if (window.opener && window.opener !== window) {
            window.opener.postMessage(msg, window.location.origin);
            window.opener.postMessage(msg, '*');
          }
        } catch { }

        try { window.close(); } catch { }
        setTimeout(() => { try { window.close(); } catch { } }, 150);
        setTimeout(() => { try { window.close(); } catch { } }, 500);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    // If user is already authenticated when visiting /login directly, redirect cleanly to dashboard
    if (typeof window !== 'undefined' && !isInsidePopup) {
      getSession().then((session) => {
        if (session?.user) {
          window.location.replace('/dashboard');
        }
      }).catch(() => {});
    }
  }, [isInsidePopup]);

  const [hasLoggedIn, setHasLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const img = new Image();
      img.src = '/api/icons/Success_Message.png';
      const v = document.createElement('video');
      v.preload = 'auto';
      v.src = '/api/icons/Loading.webm';
      v.load();
    }
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setHasLoggedIn(true);
    setAnimationStep('loading');
    setLoadingStatus('Entering Deals Portal...');

    // Brief celebratory micro-moment (180ms), then immediate native navigation.
    // Using window.location.replace completely avoids Next.js router cache poisoning
    // and ensures clean session cookie pickup without blocking on background Server Actions.
    setTimeout(() => {
      window.location.replace('/dashboard');
    }, 180);
  }, []);

  const isExpanded = animationStep === 'loading';
  const isCelebrating = hasLoggedIn || animationStep === 'celebrating' || animationStep === 'loading';
  const isSad = characterMood === 'sad' && !isCelebrating;
  const isLoading = animationStep === 'loading';

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
    // Outer wrapper: locked to viewport — no scroll on login page
    <div className="login-light-scope relative flex flex-col md:flex-row h-screen overflow-hidden bg-white selection:bg-purple-300/50">

      {/* ── Left Panel (form) ─────────────────────────────────────── */}
      <div
        className={cn(
          'login-panel-expand flex flex-col z-20 bg-white h-full',
          'px-8 sm:px-12 py-8 sm:py-10',
          isExpanded ? 'w-full md:w-[55%] lg:w-[56%]' : 'w-full md:w-1/2 lg:w-[45%]',
        )}
      >
        {isLoading ? (
          /* ── Loading state ── */
          <div className="flex-1 flex flex-col items-center justify-center py-16 login-fade-in">
            <div className="flex flex-col items-center max-w-sm text-center">
              <div className="relative mb-3 w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center select-none">
                <video autoPlay loop muted playsInline preload="auto" src="/api/icons/Loading.webm" className="w-full h-full object-contain drop-shadow-md">
                  <source src="/api/icons/Loading.webm" type="video/webm" />
                  <source src="/icons/Loading.webm" type="video/webm" />
                  <source src="/api/icons/Loading.mp4" type="video/mp4" />
                  <source src="/icons/Loading.mp4" type="video/mp4" />
                </video>
              </div>
              <h3 className={`${outfit.className} text-xl font-bold text-zinc-900 tracking-tight`}>Signing In</h3>
              <p className={`${inter.className} text-xs font-medium text-zinc-500 mt-1.5`}>{loadingStatus}</p>
              <div className="w-40 h-1 bg-zinc-100 rounded-full overflow-hidden mt-4">
                <div className="h-full w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 rounded-full login-progress-bar" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Brand header */}
            <header className="relative z-30 flex items-center w-max shrink-0">
              <div
                className="group relative flex items-center gap-2.5 cursor-pointer select-none"
                onMouseEnter={() => setIsAcronymOpen(true)}
                onMouseLeave={() => setIsAcronymOpen(false)}
                onClick={() => setIsAcronymOpen((prev) => !prev)}
                role="button"
                tabIndex={0}
                aria-label="DRÖMMAR System Acronym"
              >
                <img
                  src="/api/icons/Sidebar_Logo.png"
                  alt="DRÖMMAR Logo"
                  className="w-8 h-8 rounded-xl object-contain shadow-xs transition-transform duration-200 group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/icons/Sidebar_Logo.png'; }}
                />
                <span className={`${outfit.className} text-xl md:text-2xl font-extrabold text-[#1e1b18] tracking-tight group-hover:text-purple-700 transition-colors duration-150`}>
                  drömmar
                </span>

                {/* Floating Acronym Dropdown Popover on Hover */}
                {isAcronymOpen && (
                  <div
                    className="absolute top-full left-0 mt-2 w-[240px] bg-white rounded-xl border border-zinc-200 shadow-lg p-3.5 text-left z-50 animate-in fade-in-0 zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="pb-2 mb-2.5 border-b border-zinc-100">
                      <span className="text-xs font-bold tracking-wider text-zinc-900 uppercase">
                        DRÖMMAR
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {DROMMAR_ACRONYM.map((item, idx) => (
                        <div key={idx} className="flex items-baseline gap-2 text-xs">
                          <span className="w-3.5 font-bold font-mono text-zinc-900 shrink-0">
                            {item.letter}
                          </span>
                          <span className="text-zinc-300 select-none">–</span>
                          <span className="text-zinc-700 font-medium">
                            {item.word}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </header>

            {/* Mobile Gary Hero Banner — collapses on expanded/loading */}
            <div
              className={cn(
                'md:hidden relative w-full overflow-hidden flex flex-col items-center justify-between pt-4 pb-0 shrink-0 mt-4 rounded-2xl login-panel-expand',
                isExpanded
                  ? 'max-h-0 mt-0 opacity-0 pointer-events-none'
                  : 'max-h-[340px] opacity-100',
              )}
              style={{ background: 'linear-gradient(155deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 40%, transparent 100%), linear-gradient(60deg, #a035b5, #7b1fa2)' }}
            >
              <div className="px-6 pt-1 pb-2 text-center z-10 shrink-0">
                <h2 className={`${outfit.className} text-base font-extrabold text-white leading-snug tracking-tight`}>
                  Your deal registrations, managed seamlessly.
                </h2>
              </div>
              <div className="w-full flex-1 min-h-[200px] flex items-end justify-center relative overflow-hidden">
                <MobileGaryHeroMascot isCelebrating={isCelebrating} isSad={isSad} />
              </div>
            </div>

            {/* Form — grows to fill remaining height */}
            <main className="flex-1 flex flex-col justify-center items-center py-6 min-h-0">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center p-8">
                    <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
                  </div>
                }
              >
                <LoginForm
                  onMoodChange={setCharacterMood}
                  onAuthSuccess={handleAuthSuccess}
                  isBusy={animationStep !== 'idle'}
                  initialCsrfToken={initialCsrfToken}
                />
              </Suspense>
            </main>

            {/* Footer — always pinned at bottom, never overlaps */}
            <footer className="shrink-0 flex justify-between items-center gap-3 flex-wrap text-[13px] text-[#1e1b18]/50 font-medium pt-4 border-t border-zinc-100">
              <span>© {new Date().getFullYear()} ICS. All rights reserved.</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-zinc-400/70">
                  <Fingerprint className="w-3 h-3 shrink-0" />
                  <span className="font-medium">Enterprise SSO</span>
                </div>
                <button
                  onClick={() => setIsPrivacyModalOpen(true)}
                  className="text-[#1e1b18]/80 hover:text-[#1e1b18] font-semibold transition-colors cursor-pointer bg-transparent border-0 p-0 text-[13px]"
                >
                  Privacy Policy
                </button>
              </div>
            </footer>
          </>
        )}
      </div>

      {/* ── Right Gradient Hero Panel ─────────────────────────────── */}
      <div
        className={cn(
          'login-panel-expand hidden md:flex flex-col text-white relative overflow-hidden',
          isExpanded ? 'w-full md:w-[45%] lg:w-[44%] px-8 lg:px-14' : 'w-1/2 lg:w-[55%] px-10 lg:px-20',
        )}
        style={{ background: 'linear-gradient(155deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 40%, transparent 100%), linear-gradient(60deg, #a035b5, #7b1fa2)' }}
      >
        {/* Radial glow */}
        <div className="pointer-events-none absolute inset-0 z-0" style={{ background: 'radial-gradient(ellipse 70% 55% at 65% 30%, rgba(255,255,255,0.10) 0%, transparent 70%)' }} />

        {/* Text block — top-aligned, no badge */}
        <div className="relative z-10 w-full max-w-xl select-none pt-10 lg:pt-14 shrink-0">
          {/* clamp() font: scales from 26px at narrow → 46px at wide */}
          <h2
            className={`${outfit.className} mb-4 leading-[1.15] tracking-tight text-white font-black`}
            style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.875rem)' }}
          >
            Your deal registrations, managed seamlessly.
          </h2>
          <p
            className={`${inter.className} text-white/75 leading-relaxed font-medium`}
            style={{ fontSize: 'clamp(0.875rem, 1.3vw, 1.0rem)' }}
          >
            Log in to register deals, track pipeline status, and collaborate with your business
            units. We&apos;re excited to help you streamline your sales workflow!
          </p>
        </div>

        {/* Mascot — fills blank space above by growing upward; panel overflow-hidden clips edges */}
        <div className="absolute left-0 right-0 flex items-end justify-center z-10 mascot-rise" style={{ bottom: '-8%', height: '105%' }}>
          <GaryHeroMascot isCelebrating={isCelebrating} isSad={isSad} isMinimized={isExpanded} />
        </div>
      </div>

      <PrivacyModal visible={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client-side page shell (rendered by the server page.tsx wrapper)
// ---------------------------------------------------------------------------

export function LoginPageClient({ initialCsrfToken }: { initialCsrfToken?: string | null }) {
  return (
    <>
      <link rel="preload" as="image" href="/api/icons/Success_Message.png" />
      <link rel="preload" as="video" href="/api/icons/Loading.webm" type="video/webm" />
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
                // A popup on /login is never an OAuth success
                var m = { type: 'OAUTH_ERROR', error: err || 'OAuthCallbackError', t: Date.now() };
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
        <LoginContent initialCsrfToken={initialCsrfToken} />
      </Suspense>
    </>
  );
}
