'use client';

import React from 'react';
import { X, FileText } from 'lucide-react';
import { AppLabel } from '../labels/AppLabel';
import { AppDownloadButton } from '../buttons/AppDownloadButton';

export interface AppAttachmentCardProps {
  name: string;
  size?: number;
  onRemove?: () => void;
  onDownload?: () => void;
  onClick?: () => void;
  variant?: 'uploading' | 'shared';
  iconResolver?: (filename: string) => string;
}

export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getAttachmentIcon(filename: string, resolver?: (filename: string) => string): string {
  if (resolver) {
    return resolver(filename);
  }
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  if (extension === 'pdf') {
    return '/icons/attachments/pdf.svg';
  } else if (['xls', 'xlsx'].includes(extension)) {
    return '/icons/attachments/xls.svg';
  } else if (['gmail', 'msg', 'eml'].includes(extension)) {
    return '/icons/attachments/gmail.svg';
  } else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(extension)) {
    return '/icons/attachments/image.svg';
  } else if (['txt', 'json', 'xml', 'yaml', 'yml', 'ini', 'md', 'csv'].includes(extension)) {
    return '/icons/attachments/txt.svg';
  }
  return '/icons/attachments/doc.svg';
}

export const AppAttachmentCard: React.FC<AppAttachmentCardProps> = ({
  name,
  size,
  onRemove,
  onDownload,
  onClick,
  variant = 'shared',
  iconResolver
}) => {
  const iconSrc = getAttachmentIcon(name, iconResolver);
  const [imageError, setImageError] = React.useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (onDownload) {
      onDownload();
    }
  };

  return (
    <div
      onClick={handleClick}
      className="relative flex items-center gap-3 px-4 py-3 bg-[var(--attachment-bg)] border border-[var(--border)] rounded-2xl w-full min-w-[240px] max-w-[280px] cursor-pointer shadow-md dark:shadow-sm hover:bg-[var(--hover-bg)] transition-all duration-200"
    >
      <div className="shrink-0 select-none flex items-center justify-center w-9 h-9">
        {!imageError ? (
          <img
            src={iconSrc}
            alt="file icon"
            className="w-9 h-9 object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <FileText className="w-6 h-6 text-text-info opacity-70" />
        )}
      </div>

      <div className="flex-1 flex flex-col gap-0.5 min-w-0 text-left">
        <AppLabel
          as="p"
          className="truncate leading-tight text-[12px] font-bold text-text"
          title={name}
        >
          {name}
        </AppLabel>
        <AppLabel
          as="div"
          className="flex items-center gap-1.5 text-text-info uppercase text-[9px] font-semibold tracking-wide"
        >
          <span>
            {size !== undefined ? formatFileSize(size) : (variant === 'shared' ? 'Shared with inquiry' : '')}
          </span>
        </AppLabel>
      </div>

      {/* Quick Actions */}
      {onDownload && (
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <AppDownloadButton
            onClick={onDownload}
            className="w-7 h-7"
          />
        </div>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border border-[var(--border)] flex items-center justify-center cursor-pointer shadow-md hover:scale-110 active:scale-95 transition-all duration-200"
        >
          <X size={11} className="stroke-[3]" />
        </button>
      )}
    </div>
  );
};

AppAttachmentCard.displayName = 'AppAttachmentCard';
