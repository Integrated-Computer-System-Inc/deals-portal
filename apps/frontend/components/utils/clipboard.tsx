import { useState, useCallback } from 'react';
import { message } from 'antd';

export function useCopyToClipboard(resetInterval = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string, successMessage = 'Copied to clipboard') => {
    if (!navigator.clipboard) {
      console.warn('Clipboard not supported');
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (message) {
        message.success(successMessage);
      }
      setTimeout(() => {
        setCopied(false);
      }, resetInterval);
      return true;
    } catch (error) {
      console.warn('Copy failed', error);
      setCopied(false);
      return false;
    }
  }, [resetInterval]);

  return { copied, copy };
}
