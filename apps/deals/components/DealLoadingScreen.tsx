'use client';

import React from 'react';

interface DealLoadingScreenProps {
  title?: string;
  status?: string;
  className?: string;
  compact?: boolean;
  fullScreen?: boolean;
}

export default function DealLoadingScreen({
  title = 'Loading Deal Details',
  status = 'Fetching deal records, timeline & validity status...',
  className = '',
  compact = false,
  fullScreen = false,
}: DealLoadingScreenProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="flex flex-col items-center max-w-sm text-center p-8 bg-card-bg border border-border/60 rounded-2xl shadow-xl">
          <div className="relative flex items-center justify-center mb-5">
            <div className="w-12 h-12 border-3 border-neutral-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-sky-600 rounded-full animate-ping" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-foreground tracking-tight">
            {title}
          </h3>
          {status && (
            <p className="text-xs font-medium text-muted mt-1.5 max-w-xs transition-all duration-200">
              {status}
            </p>
          )}
          <div className="w-44 h-1 bg-neutral-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-5">
            <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center text-center animate-in fade-in duration-200 ${
        compact ? 'py-12 px-4' : 'min-h-[50vh] py-16 px-6'
      } ${className}`}
    >
      <div className="flex flex-col items-center max-w-sm">
        {/* Polished Dual-Ring Spinner matching Login Screen */}
        <div className="relative flex items-center justify-center mb-5">
          <div
            className={`${
              compact ? 'w-10 h-10 border-3' : 'w-12 h-12 border-3'
            } border-neutral-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin`}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-sky-600 rounded-full animate-ping" />
          </div>
        </div>

        {/* Title */}
        <h3
          className={`${
            compact ? 'text-base' : 'text-lg'
          } font-bold text-foreground tracking-tight`}
        >
          {title}
        </h3>

        {/* Status */}
        {status && (
          <p className="text-xs font-medium text-muted mt-1.5 max-w-xs transition-all duration-200">
            {status}
          </p>
        )}

        {/* Animated Gradient Progress Line */}
        <div
          className={`${
            compact ? 'w-36 mt-4' : 'w-48 mt-5'
          } h-1 bg-neutral-200 dark:bg-zinc-800 rounded-full overflow-hidden`}
        >
          <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full animate-pulse w-3/4" />
        </div>
      </div>
    </div>
  );
}
