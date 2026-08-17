'use client';

import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#1e2024] text-[#f3f4f6] flex items-center justify-center p-6 font-sans antialiased">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#262930] border border-[#383d47] text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-xs">
            <AlertOctagon className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-[#f3f4f6] tracking-tight">Application Error</h2>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              {error?.message || 'A critical error occurred. Please refresh or try again.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] text-white text-xs font-semibold rounded-xl hover:opacity-90 transition shadow-md cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reload Application</span>
          </button>
        </div>
      </body>
    </html>
  );
}
