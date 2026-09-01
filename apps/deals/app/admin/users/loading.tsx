'use client';

import React from 'react';

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`bg-neutral-200 dark:bg-zinc-800 rounded animate-pulse ${className ?? ''}`} />
  );
}

export default function AdminUsersLoading() {
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Shimmer className="h-8 w-8 rounded-xl" />
            <Shimmer className="h-7 w-52" />
          </div>
          <Shimmer className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="h-9 w-28 rounded-xl" />
          <Shimmer className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 bg-card-bg rounded-2xl border border-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <Shimmer className="h-3.5 w-20" />
              <Shimmer className="h-7 w-7 rounded-full" />
            </div>
            <Shimmer className="h-7 w-14" />
          </div>
        ))}
      </div>

      {/* Search & Filter Bar Skeleton */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Shimmer className="h-10 flex-1 rounded-xl" />
        <div className="flex items-center gap-2">
          <Shimmer className="h-10 w-36 rounded-xl" />
          <Shimmer className="h-10 w-32 rounded-xl" />
          <Shimmer className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-card-bg rounded-2xl border border-border/60 overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center gap-4 px-5 py-3.5 border-b border-border/60 bg-neutral/40">
          <Shimmer className="h-3 w-8" />
          <Shimmer className="h-3 w-36 ml-2" />
          <Shimmer className="h-3 w-28 ml-auto" />
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-3 w-24" />
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-3 w-20" />
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border/40">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              {/* Avatar + Name */}
              <div className="flex items-center gap-3 w-56 shrink-0">
                <Shimmer className="h-9 w-9 rounded-full shrink-0" />
                <div className="space-y-1.5 min-w-0 flex-1">
                  <Shimmer className="h-3.5 w-32" />
                  <Shimmer className="h-3 w-44" />
                </div>
              </div>

              {/* Role badge */}
              <Shimmer className="h-6 w-24 rounded-full ml-auto" />

              {/* BU Tag */}
              <Shimmer className="h-6 w-16 rounded-full" />

              {/* Brand Assignment */}
              <div className="flex items-center gap-1">
                <Shimmer className="h-6 w-14 rounded-full" />
                <Shimmer className="h-6 w-14 rounded-full" />
              </div>

              {/* Status */}
              <Shimmer className="h-6 w-16 rounded-full" />

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <Shimmer className="h-8 w-8 rounded-lg" />
                <Shimmer className="h-8 w-8 rounded-lg" />
                <Shimmer className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Table Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border/50">
          <Shimmer className="h-4 w-36" />
          <div className="flex items-center gap-2">
            <Shimmer className="h-8 w-8 rounded-lg" />
            <Shimmer className="h-8 w-8 rounded-lg" />
            <Shimmer className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
