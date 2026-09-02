'use client';

import { useEffect } from 'react';
import { useDevMode } from './DevModeContext';

export function SecurityGuard() {
  const { isDevMode } = useDevMode();

  useEffect(() => {
    // If IT Admin has enabled Developer Mode, allow right-click & DevTools shortcuts
    if (isDevMode) {
      return;
    }

    // 1. Disable Right-Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 2. Disable Developer Tools & View Source Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable;

      // F12 key (DevTools)
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+I / Cmd+Option+I (DevTools Inspect)
      // Ctrl+Shift+J / Cmd+Option+J (DevTools Console)
      // Ctrl+Shift+C / Cmd+Option+C (Inspect Element)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === 'I' ||
          e.key === 'i' ||
          e.key === 'J' ||
          e.key === 'j' ||
          e.key === 'C' ||
          e.key === 'c')
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+U / Cmd+U (View Page Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+S / Cmd+S (Save Page)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        if (!isInput) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    // Add listeners to document
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isDevMode]);

  return null;
}

