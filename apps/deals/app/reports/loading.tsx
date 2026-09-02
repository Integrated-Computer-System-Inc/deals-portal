'use client';

import React from 'react';

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse ${className ?? ''}`} />
  );
}

export default function ReportsLoading() {
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Page Header Skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Shimmer className="h-7 w-52" />
          <Shimmer className="h-4 w-80" />
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="h-9 w-36 rounded-xl" />
          <Shimmer className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 bg-card-bg rounded-2xl border border-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <Shimmer className="h-3.5 w-24" />
              <Shimmer className="h-8 w-8 rounded-full" />
            </div>
            <Shimmer className="h-8 w-32" />
            <Shimmer className="h-3 w-3/4" />
            <div className="h-1.5 w-full bg-neutral-200 dark:bg-zinc-800 rounded-full" />
          </div>
        ))}
      </div>

      {/* Quick Insights Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-card-bg rounded-2xl border border-border/60 space-y-2.5">
            <div className="flex items-center gap-2">
              <Shimmer className="h-5 w-5 rounded" />
              <Shimmer className="h-4 w-32" />
            </div>
            <Shimmer className="h-6 w-20" />
            <Shimmer className="h-3 w-full" />
          </div>
        ))}
      </div>

      {/* Brand Matrix Skeleton */}
      <div className="bg-card-bg rounded-2xl border border-border/60 overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <div className="space-y-1.5">
            <Shimmer className="h-5 w-44" />
            <Shimmer className="h-3.5 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Shimmer className="h-8 w-36 rounded-xl" />
            <Shimmer className="h-8 w-28 rounded-xl" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          {/* Filter bar */}
          <div className="flex items-center gap-2">
            <Shimmer className="h-9 w-full rounded-xl" />
            <Shimmer className="h-9 w-28 rounded-xl" />
          </div>
          {/* Table header */}
          <div className="flex items-center gap-3 px-3 py-2">
            <Shimmer className="h-3 w-32" />
            <Shimmer className="h-3 w-16 ml-auto" />
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-3 w-20" />
          </div>
          {/* Table rows */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-border/40">
              <Shimmer className="h-7 w-7 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Shimmer className="h-3.5 w-32" />
                <Shimmer className="h-2 w-full max-w-sm rounded-full" />
              </div>
              <Shimmer className="h-4 w-8 ml-auto" />
              <Shimmer className="h-4 w-24" />
              <Shimmer className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* BU Matrix Skeleton */}
      <div className="bg-card-bg rounded-2xl border border-border/60 overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <div className="space-y-1.5">
            <Shimmer className="h-5 w-48" />
            <Shimmer className="h-3.5 w-72" />
          </div>
          <div className="flex items-center gap-2">
            <Shimmer className="h-8 w-32 rounded-xl" />
            <Shimmer className="h-8 w-28 rounded-xl" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shimmer className="h-9 w-full rounded-xl" />
            <Shimmer className="h-9 w-36 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-4 rounded-xl border border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                  <Shimmer className="h-4 w-20" />
                  <Shimmer className="h-5 w-10 rounded-full" />
                </div>
                <Shimmer className="h-2 w-full rounded-full" />
                <div className="flex justify-between">
                  <Shimmer className="h-3 w-16" />
                  <Shimmer className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
