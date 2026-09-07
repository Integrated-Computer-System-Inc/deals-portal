'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Tooltip } from 'antd';
import { useTour } from './TourProvider';

interface TourTriggerProps {
  tourName?: string;
  collapsed?: boolean;
  className?: string;
}

export default function TourTrigger({
  tourName = 'dashboard-tour',
  collapsed = false,
  className = '',
}: TourTriggerProps) {
  const { startTour } = useTour();
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname !== '/dashboard') {
      router.push('/dashboard');
      setTimeout(() => {
        startTour(tourName);
      }, 300);
    } else {
      startTour(tourName);
    }
  };

  const button = (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Start Product Tour"
      className={`group flex items-center gap-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-neutral/80 transition-colors cursor-pointer ${
        collapsed ? 'justify-center p-2 w-full' : 'px-2.5 py-1.5 text-xs font-medium w-full'
      } ${className}`}
    >
      <Sparkles className="w-4 h-4 text-primary shrink-0 transition-transform group-hover:scale-110" />
      {!collapsed && <span>Guided Tour</span>}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip title="Start Guided Tour" placement="right">
        {button}
      </Tooltip>
    );
  }

  return button;
}
