'use client';

import React from 'react';
import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <img
        src="/api/icons/404_Error.png"
        alt="404 Page Not Found"
        className="w-48 h-48 object-contain drop-shadow-sm select-none"
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/icons/404_Error.png';
        }}
      />

      <div className="space-y-1.5 max-w-md">
        <h2 className="text-xl font-bold text-foreground tracking-tight">404 - Page Not Found</h2>
        <p className="text-xs text-muted leading-relaxed">
          The page or resource you are looking for does not exist or has been moved.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:opacity-90 transition shadow-xs cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>

        <Link
          href="/deals"
          className="flex items-center gap-2 px-4 py-2 bg-neutral text-foreground border border-border text-xs font-semibold rounded-xl hover:bg-neutral/80 transition shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Deals Registry</span>
        </Link>
      </div>
    </div>
  );
}
