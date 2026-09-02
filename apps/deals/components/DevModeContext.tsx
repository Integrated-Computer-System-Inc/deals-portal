'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface DevModeContextType {
  isDevMode: boolean;
  isITAdmin: boolean;
  toggleDevMode: () => void;
  setDevMode: (enabled: boolean) => void;
}

const DevModeContext = createContext<DevModeContextType>({
  isDevMode: false,
  isITAdmin: false,
  toggleDevMode: () => {},
  setDevMode: () => {},
});

const STORAGE_KEY = 'dealreg-dev-mode';

export function DevModeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const userRole = (session?.user as any)?.role;
  const isITAdmin = status === 'authenticated' && userRole === 'ITadmin';

  const [isDevMode, setIsDevModeState] = useState<boolean>(false);

  // Initialize from localStorage when IT Admin logs in
  useEffect(() => {
    if (isITAdmin) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'true') {
          setIsDevModeState(true);
        } else {
          setIsDevModeState(false);
        }
      } catch {
        setIsDevModeState(false);
      }
    } else {
      // Non-IT admin users can never have dev mode active
      setIsDevModeState(false);
    }
  }, [isITAdmin]);

  // Apply or remove DOM effects (e.g. data-dev-mode attribute and user-select)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (isDevMode && isITAdmin) {
      document.documentElement.setAttribute('data-dev-mode', 'true');
      document.body.classList.remove('select-none');
      document.body.style.userSelect = 'auto';
    } else {
      document.documentElement.removeAttribute('data-dev-mode');
      if (!document.body.classList.contains('select-none')) {
        document.body.classList.add('select-none');
      }
      document.body.style.userSelect = '';
    }
  }, [isDevMode, isITAdmin]);

  const setDevMode = (enabled: boolean) => {
    if (!isITAdmin) return;
    setIsDevModeState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {}
  };

  const toggleDevMode = () => {
    setDevMode(!isDevMode);
  };

  return (
    <DevModeContext.Provider
      value={{
        isDevMode: isITAdmin && isDevMode,
        isITAdmin,
        toggleDevMode,
        setDevMode,
      }}
    >
      {children}
    </DevModeContext.Provider>
  );
}

export function useDevMode() {
  return useContext(DevModeContext);
}
