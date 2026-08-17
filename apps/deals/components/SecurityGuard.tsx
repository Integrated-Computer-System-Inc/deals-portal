'use client';

import React, { useEffect } from 'react';
import { message } from 'antd';

export function SecurityGuard() {
  useEffect(() => {
    // 1. Prevent context menu (right click)
    const handleContextMenu = (e: MouseEvent) => {
      // Allow right click if user is explicitly inside a form input/textarea for editing
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
    };

    // 2. Prevent keyboard shortcuts for DevTools, Page Source, and Screenshot keys
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // F12 or PrintScreen
      if (e.key === 'F12' || e.key === 'PrintScreen') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools)
      if (ctrlOrCmd && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl+U (View Source)
      if (ctrlOrCmd && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl+S (Save page)
      if (ctrlOrCmd && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl+P (Print page)
      if (ctrlOrCmd && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    // 3. Prevent Copy, Cut, Paste outside editable text fields
    const handleCopyCutPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('contenteditable') === 'true');

      if (!isEditable) {
        e.preventDefault();
        if (e.type === 'copy') {
          message.warning({
            content: 'Copying portal data is restricted for security.',
            key: 'security-copy-warn',
            duration: 2,
          });
        }
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopyCutPaste);
    document.addEventListener('cut', handleCopyCutPaste);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopyCutPaste);
      document.removeEventListener('cut', handleCopyCutPaste);
    };
  }, []);

  return null;
}
