'use client';

import React from 'react';
import { Bookmark } from 'lucide-react';

interface AppBookmarkProps {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: number;
  className?: string;
  title?: string;
}

export function AppBookmark({
  active,
  onClick,
  size = 18,
  className = '',
  title = 'Bookmark',
}: AppBookmarkProps) {
  return (
    <button
      onClick={onClick}
      className={`text-text-info hover:text-[#e5c158] transition-colors cursor-pointer shrink-0 ${className}`}
      title={title}
    >
      <Bookmark
        size={size}
        className={active ? 'fill-[#e5c158] text-[#e5c158]' : 'text-text-info'}
      />
    </button>
  );
}
