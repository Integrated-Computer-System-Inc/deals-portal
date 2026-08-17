'use client';

import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Hero Banner Skeleton */}
      <div className="rounded-2xl p-6 sm:p-8 bg-neutral/60 dark:bg-zinc-850 border border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 flex-1">
          <div className="h-5 w-44 bg-neutral-300 dark:bg-zinc-700 rounded-md animate-pulse" />
          <div className="h-8 w-72 bg-neutral-300 dark:bg-zinc-700 rounded-lg animate-pulse" />
          <div className="h-4 w-4/5 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-28 bg-neutral-300 dark:bg-zinc-700 rounded-xl animate-pulse" />
          <div className="h-10 w-32 bg-neutral-300 dark:bg-zinc-700 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* 4 KPI Metrics Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 sm:p-5 space-y-3 bg-card-bg rounded-2xl border border-border/60">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-20 bg-neutral-200 dark:bg-zinc-750 rounded animate-pulse" />
              <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-zinc-750 animate-pulse" />
            </div>
            <div className="h-7 w-28 bg-neutral-300 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="h-3 w-3/4 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Brand Breakdown & Recent Deals Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-40 bg-neutral-300 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="h-4 w-20 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-4 bg-card-bg rounded-xl border border-border/60 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-20 bg-neutral-300 dark:bg-zinc-700 rounded animate-pulse" />
                  <div className="h-4 w-12 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="h-2 w-full bg-neutral-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                <div className="h-3 w-24 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar Recent Deals Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-36 bg-neutral-300 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="h-4 w-16 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3.5 bg-card-bg rounded-xl border border-border/60 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-28 bg-neutral-300 dark:bg-zinc-700 rounded animate-pulse" />
                  <div className="h-4 w-14 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="h-3.5 w-3/4 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
                <div className="flex justify-between items-center pt-1">
                  <div className="h-3 w-16 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-3.5 w-20 bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
