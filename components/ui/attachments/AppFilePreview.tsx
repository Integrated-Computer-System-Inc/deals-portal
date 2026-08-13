'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';
import { AppLabel } from '../labels/AppLabel';
import { AppButton } from '../buttons/AppButton';
import { formatFileSize, getAttachmentIcon } from './AppAttachmentCard';

export interface AppFilePreviewProps {
  open: boolean;
  onClose: () => void;
  file: File | string | null;
  onDownload?: (file: File | string) => void;
}

export const AppFilePreview: React.FC<AppFilePreviewProps> = ({
  open,
  onClose,
  file,
  onDownload
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Esc key and scroll locking logic
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !file) {
      setBlobUrl(null);
      setHasError(false);
      return;
    }

    setHasError(false);

    if (file instanceof File) {
      // Re-create blob with explicit MIME type to ensure inline rendering (not download)
      const mimeType = file.type || 'application/octet-stream';
      const blob = new Blob([file], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (typeof file === 'string') {
      setBlobUrl(file);
    }
  }, [open, file]);

  if (!open || !file || !mounted) return null;

  const fileName = file instanceof File ? file.name : file;
  const fileSize = file instanceof File ? file.size : undefined;
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  const isImage = file instanceof File ? file.type.startsWith('image/') : ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(extension);
  const isPdf = file instanceof File ? file.type === 'application/pdf' : extension === 'pdf';

  const handleDownload = () => {
    if (onDownload) {
      onDownload(file);
      return;
    }

    if (file instanceof File) {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (blobUrl && !hasError) {
      window.open(blobUrl, '_blank');
    }
  };

  const renderPreviewContent = () => {
    // If error occurs or format not supported or 404
    if (hasError || (!isImage && !isPdf)) {
      const iconSrc = getAttachmentIcon(fileName);

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center max-w-md bg-card-bg border border-border/40 rounded-2xl shadow-xl space-y-4">
          <img src={iconSrc} alt="file type icon" className="w-16 h-16 object-contain" />
          <div className="space-y-1">
            <AppLabel as="h3" className="text-base font-bold text-text">
              Preview Unavailable
            </AppLabel>
            <AppLabel as="p" variant="description" className="text-xs text-text-info">
              This file type cannot be previewed directly in the browser. Click below to download the file.
            </AppLabel>
          </div>
          <AppButton variant="accent" size="sm" onClick={handleDownload} leftIcon={<Download size={14} />}>
            Download File
          </AppButton>
        </div>
      );
    }

    // 1. Image Preview
    if (isImage && blobUrl) {
      return (
        <img
          src={blobUrl}
          alt={fileName}
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl transition-all duration-300"
          onError={() => setHasError(true)}
        />
      );
    }

    // 2. PDF Preview
    if (isPdf && blobUrl) {
      // Append #toolbar=0 to hint browser to render inline (not download)
      const inlineSrc = blobUrl.includes('#') ? blobUrl : `${blobUrl}#toolbar=0`;
      return (
        <object
          data={inlineSrc}
          type="application/pdf"
          className="w-full h-full border-0 bg-white"
          onError={() => setHasError(true)}
        >
          <iframe
            src={inlineSrc}
            className="w-full h-full border-0 bg-white"
            title={fileName}
            onError={() => setHasError(true)}
          />
        </object>
      );
    }

    return null;
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex flex-col bg-background/95 text-text backdrop-blur-md animate-fade-in font-sans">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-1.5 bg-card-bg/90 border-b border-border/40 shrink-0">
        <div className="min-w-0 flex items-center gap-3">
          <img
            src={getAttachmentIcon(fileName)}
            alt="file icon"
            className="w-6 h-6 object-contain shrink-0"
          />
          <div className="min-w-0">
            <AppLabel as="h2" className="text-sm font-bold text-text truncate">
              {fileName}
            </AppLabel>
            {fileSize && (
              <AppLabel as="p" variant="description" className="text-[10px] text-text-info mt-0.5">
                {formatFileSize(fileSize)}
              </AppLabel>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <AppButton
            variant="ghost"
            size="icon"
            shape="pill"
            title="Download"
            onClick={handleDownload}
          >
            <Download size={15} />
          </AppButton>
          <AppButton
            variant="ghost"
            size="icon"
            shape="pill"
            title="Close"
            onClick={onClose}
          >
            <X size={16} />
          </AppButton>
        </div>
      </div>

      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        className="flex-1 w-full h-full overflow-hidden relative bg-neutral/5 flex items-center justify-center cursor-zoom-out"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full h-full flex items-center justify-center cursor-default"
        >
          {renderPreviewContent()}
        </div>
      </div>
    </div>,
    document.body
  );
};

AppFilePreview.displayName = 'AppFilePreview';
