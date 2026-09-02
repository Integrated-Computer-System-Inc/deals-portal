'use client';

import React from 'react';
import { Tooltip, message } from 'antd';
import { Code2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useDevMode } from './DevModeContext';
import { AppButton } from './ui/buttons';

export default function DevModeToggle({ placement = 'top' }: { placement?: 'top' | 'right' | 'bottom' | 'left' }) {
  const { isDevMode, isITAdmin, toggleDevMode } = useDevMode();

  if (!isITAdmin) {
    return null;
  }

  const handleToggle = () => {
    const nextState = !isDevMode;
    toggleDevMode();
    if (nextState) {
      message.success({
        content: 'Developer Mode ON: Right-click context menu & DevTools shortcuts enabled.',
        key: 'dev-mode-toast',
        duration: 3,
      });
    } else {
      message.info({
        content: 'Developer Mode OFF: Security protections active (Right-click & DevTools blocked).',
        key: 'dev-mode-toast',
        duration: 3,
      });
    }
  };

  const tooltipTitle = isDevMode
    ? 'Developer Mode: ON (Right-click & DevTools unlocked)'
    : 'Developer Mode: OFF (Right-click & DevTools blocked)';

  return (
    <Tooltip title={tooltipTitle} placement={placement}>
      <div>
        <AppButton
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          className={`shrink-0 h-9 w-9 flex items-center justify-center rounded-lg relative transition mx-auto cursor-pointer ${
            isDevMode
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 shadow-xs'
              : 'text-muted hover:text-foreground hover:bg-neutral border border-transparent'
          }`}
          aria-label="Toggle Developer Mode"
          leftIcon={
            <div className="relative flex items-center justify-center">
              <Code2 size={17} className={isDevMode ? 'text-emerald-500 animate-pulse' : 'text-muted'} />
              <span
                className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ring-1 ring-background shadow-xs transition-colors duration-300 ${
                  isDevMode ? 'bg-emerald-500 ring-emerald-500/40' : 'bg-zinc-400 opacity-60'
                }`}
              />
            </div>
          }
        />
      </div>
    </Tooltip>
  );
}
