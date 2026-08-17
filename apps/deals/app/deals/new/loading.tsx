'use client';

import React from 'react';

export default function NewDealLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Top Header Skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-neutral-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          <div className="h-7 w-48 bg-neutral-300 dark:bg-zinc-700 rounded-lg animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 bg-neutral-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          <div className="h-9 w-36 bg-neutral-300 dark:bg-zinc-700 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Section 1 Skeleton */}
      <div className="p-5 bg-card-bg rounded-2xl border border-border/60 space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="h-4 w-40 bg-neutral-300 dark:bg-zinc-700 rounded animate-pulse" />
          <div className="h-7 w-32 bg-neutral-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <div className="h-3.5 w-32 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-10 w-full bg-neutral-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-28 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-10 w-full bg-neutral-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>

      {/* Section 2 Skeleton */}
      <div className="p-5 bg-card-bg rounded-2xl border border-border/60 space-y-4">
        <div className="border-b border-border/50 pb-3">
          <div className="h-4 w-48 bg-neutral-300 dark:bg-zinc-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3.5 w-28 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-10 w-full bg-neutral-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
