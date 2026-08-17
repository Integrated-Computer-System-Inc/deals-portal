'use client';

import React from 'react';

export default function DealsLoading() {
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Top Header Bar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-7 w-48 bg-neutral-300 dark:bg-zinc-700 rounded-lg animate-pulse" />
          <div className="h-3.5 w-64 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 bg-neutral-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          <div className="h-9 w-32 bg-neutral-300 dark:bg-zinc-700 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Search & Filter Toolbar Skeleton */}
      <div className="p-4 bg-card-bg rounded-2xl border border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="h-10 w-full bg-neutral-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 bg-neutral-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          <div className="h-9 w-24 bg-neutral-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl border border-border/70 overflow-hidden bg-card-bg">
        <div className="p-3.5 bg-neutral/50 dark:bg-zinc-800/60 border-b border-border flex items-center justify-between">
          <div className="h-4 w-32 bg-neutral-300 dark:bg-zinc-700 rounded animate-pulse" />
          <div className="h-4 w-24 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-border/50">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="h-4 w-28 bg-neutral-300 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-3/5 bg-neutral-300 dark:bg-zinc-700 rounded animate-pulse" />
                  <div className="h-3 w-2/5 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-5 w-16 bg-neutral-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                <div className="h-5 w-20 bg-neutral-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                <div className="h-4 w-20 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
                <div className="h-7 w-7 bg-neutral-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
