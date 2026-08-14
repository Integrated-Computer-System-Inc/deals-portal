'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { Tooltip } from 'antd';
import { TooltipPlacement } from 'antd/es/tooltip';
import { cn } from '../../utils/cn';
import { AppButton, AppButtonProps } from './AppButton';

export interface AppDownloadButtonProps extends Omit<AppButtonProps, 'children'> {
    tooltipTitle?: string;
    tooltipPlacement?: TooltipPlacement;
    tooltipZIndex?: number;
}

export const AppDownloadButton = React.forwardRef<HTMLButtonElement, AppDownloadButtonProps>(
    ({
        tooltipTitle = 'Download file',
        tooltipPlacement = 'top',
        tooltipZIndex = 1005,
        className,
        size = 'sm',
        ...props
    }, ref) => {
        const iconSize = size === 'sm' ? 14 : 16;
        return (
            <Tooltip title={tooltipTitle} placement={tooltipPlacement} zIndex={tooltipZIndex}>
                <AppButton
                    ref={ref}
                    variant="neutral"
                    size={size}
                    className={cn(
                        'w-9 h-9 p-0 bg-transparent hover:bg-black/10 text-text-info hover:text-foreground dark:hover:bg-white/10 border-0 transition-all shadow-none rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-50',
                        className
                    )}
                    {...props}
                >
                    {!props.loading && <Download size={iconSize} className="shrink-0" />}
                </AppButton>
            </Tooltip>
        );
    }
);

AppDownloadButton.displayName = 'AppDownloadButton';
