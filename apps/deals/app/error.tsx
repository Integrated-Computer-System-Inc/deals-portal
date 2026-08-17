'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Application Error Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-xs">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <div className="space-y-1.5 max-w-md">
        <h2 className="text-xl font-bold text-foreground tracking-tight">Something went wrong</h2>
        <p className="text-xs text-muted leading-relaxed">
          {error?.message || 'An unexpected error occurred while loading this view.'}
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:opacity-90 transition shadow-xs cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Try again</span>
        </button>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 bg-neutral text-foreground border border-border text-xs font-semibold rounded-xl hover:bg-neutral/80 transition shadow-xs"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Go to Home</span>
        </Link>
      </div>
    </div>
  );
}
