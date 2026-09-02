'use client';

import React from 'react';

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse ${className ?? ''}`} />
  );
}

export default function EditDealLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Top Header Skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shimmer className="h-9 w-9 rounded-xl" />
          <div className="space-y-1.5">
            <Shimmer className="h-6 w-48" />
            <Shimmer className="h-3.5 w-64" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="h-9 w-20 rounded-xl" />
          <Shimmer className="h-9 w-36 rounded-xl" />
        </div>
      </div>

      {/* Section 1: Deal Info */}
      <div className="p-5 bg-card-bg rounded-2xl border border-border/60 space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <Shimmer className="h-4 w-40" />
          <Shimmer className="h-7 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Shimmer className="h-3.5 w-32" />
            <Shimmer className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Shimmer className="h-3.5 w-28" />
            <Shimmer className="h-10 w-full rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Shimmer className="h-3.5 w-28" />
              <Shimmer className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Registration Details */}
      <div className="p-5 bg-card-bg rounded-2xl border border-border/60 space-y-4">
        <div className="border-b border-border/50 pb-3">
          <Shimmer className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <Shimmer className="h-3.5 w-28" />
              <Shimmer className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Items / Line Items */}
      <div className="p-5 bg-card-bg rounded-2xl border border-border/60 space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <Shimmer className="h-4 w-36" />
          <Shimmer className="h-8 w-24 rounded-xl" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3.5 rounded-xl border border-border/40 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 space-y-1.5">
                <Shimmer className="h-3 w-20" />
                <Shimmer className="h-10 w-full rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Shimmer className="h-3 w-16" />
                <Shimmer className="h-10 w-full rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Shimmer className="h-3 w-16" />
                <Shimmer className="h-10 w-full rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
