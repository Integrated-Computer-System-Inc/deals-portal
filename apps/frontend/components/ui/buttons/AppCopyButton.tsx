'use client';

import React from 'react';
import { Copy, Check } from 'lucide-react';
import { Tooltip } from 'antd';
import { TooltipPlacement } from 'antd/es/tooltip';
import { cn } from '../../utils/cn';
import { AppButton, AppButtonProps } from './AppButton';

export interface AppCopyButtonProps extends Omit<AppButtonProps, 'children'> {
    copied?: boolean;
    tooltipTitle?: string;
    copiedTooltipTitle?: string;
    tooltipPlacement?: TooltipPlacement;
    tooltipZIndex?: number;
}

export const AppCopyButton = React.forwardRef<HTMLButtonElement, AppCopyButtonProps>(
    ({
        copied = false,
        tooltipTitle = 'Copy content',
        copiedTooltipTitle = 'Copied!',
        tooltipPlacement = 'top',
        tooltipZIndex = 1005,
        className,
        size = 'sm',
        ...props
    }, ref) => {
        const iconSize = size === 'sm' ? 14 : 16;
        return (
            <Tooltip title={copied ? copiedTooltipTitle : tooltipTitle} placement={tooltipPlacement} zIndex={tooltipZIndex}>
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
                    {!props.loading && (copied ? (
                        <Check size={iconSize} className="text-green-500 shrink-0" />
                    ) : (
                        <Copy size={iconSize} className="shrink-0" />
                    ))}
                </AppButton>
            </Tooltip>
        );
    }
);

AppCopyButton.displayName = 'AppCopyButton';
