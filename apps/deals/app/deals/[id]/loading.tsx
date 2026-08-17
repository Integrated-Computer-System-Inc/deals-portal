'use client';

import React from 'react';

export default function DealDetailsLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Top Bar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-neutral-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-6 w-52 bg-neutral-300 dark:bg-zinc-700 rounded-lg animate-pulse" />
            <div className="h-3.5 w-32 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 bg-neutral-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          <div className="h-9 w-28 bg-neutral-300 dark:bg-zinc-700 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Customer Info Card Skeleton */}
      <div className="p-5 bg-card-bg rounded-2xl border border-border/60 space-y-4">
        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
          <div className="h-4 w-4 bg-neutral-200 dark:bg-zinc-800 rounded-full animate-pulse" />
          <div className="h-4 w-40 bg-neutral-300 dark:bg-zinc-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-16 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-5 w-4/5 bg-neutral-300 dark:bg-zinc-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Card Skeleton */}
      <div className="p-5 bg-card-bg rounded-2xl border border-border/60 space-y-4">
        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
          <div className="h-4 w-4 bg-neutral-200 dark:bg-zinc-800 rounded-full animate-pulse" />
          <div className="h-4 w-44 bg-neutral-300 dark:bg-zinc-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-xl bg-neutral/40 dark:bg-zinc-800/40 space-y-1.5">
              <div className="h-3 w-20 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-5 w-28 bg-neutral-300 dark:bg-zinc-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Items Card Skeleton */}
      <div className="p-5 bg-card-bg rounded-2xl border border-border/60 space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="h-4 w-40 bg-neutral-300 dark:bg-zinc-700 rounded animate-pulse" />
          <div className="h-4 w-20 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-border/50">
          {[1, 2, 3].map((i) => (
            <div key={i} className="py-3 flex justify-between items-center">
              <div className="h-4 w-1/2 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-24 bg-neutral-300 dark:bg-zinc-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
