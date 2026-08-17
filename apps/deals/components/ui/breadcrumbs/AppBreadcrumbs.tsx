'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface BreadcrumbItem {
  label: React.ReactNode;
  href?: string;
  icon?: React.ReactNode;
  active?: boolean;
}

export interface AppBreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  showHomeIcon?: boolean;
}

export const AppBreadcrumbs: React.FC<AppBreadcrumbsProps> = ({
  items,
  separator = <ChevronRight className="w-3.5 h-3.5 text-muted/60 shrink-0" />,
  showHomeIcon = true,
  className,
  ...props
}) => {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumbs"
      className={cn(
        'flex items-center text-xs text-muted font-medium select-none overflow-x-auto no-scrollbar py-1',
        className
      )}
      {...props}
    >
      <ol className="flex items-center gap-1.5 flex-nowrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isActive = item.active ?? isLast;

          return (
            <li key={index} className="flex items-center gap-1.5 shrink-0">
              {index > 0 && <span aria-hidden="true">{separator}</span>}

              {item.href && !isActive ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 text-muted hover:text-foreground hover:underline transition-colors px-1 py-0.5 rounded-md hover:bg-neutral/60"
                >
                  {index === 0 && showHomeIcon && !item.icon && (
                    <Home className="w-3.5 h-3.5 shrink-0" />
                  )}
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span className="truncate max-w-[180px]">{item.label}</span>
                </Link>
              ) : (
                <div
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-1.5 px-1 py-0.5 rounded-md',
                    isActive
                      ? 'text-foreground font-semibold bg-neutral/80 border border-border/40'
                      : 'text-muted'
                  )}
                >
                  {index === 0 && showHomeIcon && !item.icon && (
                    <Home className="w-3.5 h-3.5 shrink-0" />
                  )}
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span className="truncate max-w-[240px]">{item.label}</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default AppBreadcrumbs;
