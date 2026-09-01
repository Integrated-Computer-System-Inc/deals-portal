'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { AppLabel } from '../labels';
import { FolderSearch, LucideIcon } from 'lucide-react';

export interface AppEmptyStateProps {
  title?: string;
  description?: React.ReactNode;
  imageSrc?: string | null;
  icon?: LucideIcon;
  action?: React.ReactNode;
  bordered?: boolean;
  className?: string;
}

export default function AppEmptyState({
  title = 'No deals found',
  description = 'There is no data matching your current filters or search criteria.',
  imageSrc = '/api/icons/No_Deals_Found.png',
  icon: Icon = FolderSearch,
  action,
  bordered = false,
  className,
}: AppEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-8 px-4 text-center select-none",
        bordered && "rounded-2xl border border-dashed border-border/60 bg-card-bg/40",
        className
      )}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={title}
          className="w-32 h-32 object-contain drop-shadow-xs select-none"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/icons/No_Deals_Found.png';
          }}
        />
      ) : (
        <div className="w-12 h-12 rounded-2xl bg-neutral/80 dark:bg-zinc-800/80 border border-border/80 flex items-center justify-center shadow-xs">
          <Icon className="w-6 h-6 text-muted dark:text-zinc-400" />
        </div>
      )}

      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-bold text-foreground dark:text-zinc-100">
          {title}
        </h4>
        {description && (
          <p className="text-xs text-muted dark:text-zinc-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
