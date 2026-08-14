'use client';

import React from 'react';
import { AppPopover, AppPopoverProps } from './AppPopover';
import { AppButton } from '../buttons';
import { cn } from '../../utils/cn';

export interface FilterGroupProps {
    title: string;
    showReset?: boolean;
    onReset?: () => void;
    children: React.ReactNode;
    className?: string;
}

export function FilterGroup({
    title,
    showReset = false,
    onReset,
    children,
    className,
}: FilterGroupProps) {
    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <div className="flex items-center justify-between px-0.5">
                <span className="text-[11px] font-bold text-text-info uppercase tracking-wider">
                    {title}
                </span>
                {showReset && onReset && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="text-text-info hover:text-accent-1 text-xs font-medium hover:underline cursor-pointer transition-colors"
                    >
                        Reset
                    </button>
                )}
            </div>
            <div className="text-sm bg-neutral/40 rounded-md px-2 py-0.5 border border-border/40">
                {children}
            </div>
        </div>
    );
}
FilterGroup.displayName = 'AppFilterPopover.Group';

export interface AppFilterPopoverProps extends Omit<AppPopoverProps, 'content' | 'trigger'> {
    trigger: React.ReactNode;
    children: React.ReactNode;
    title?: string;
    onResetAll?: () => void;
    onApply?: () => void;
    onClose?: () => void;
    className?: string;
    bodyClassName?: string;
}

export function AppFilterPopover({
    trigger,
    children,
    title = 'Filters',
    onResetAll,
    onApply,
    onClose,
    className,
    bodyClassName,
    open,
    onOpenChange,
    placement = 'bottomRight',
    ...props
}: AppFilterPopoverProps) {
    const content = (
        <div className={cn('w-[280px] p-4 flex flex-col gap-4 select-none', className)}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5 shrink-0">
                <span className="font-bold text-foreground text-sm">{title}</span>
                {onResetAll && (
                    <button
                        type="button"
                        onClick={onResetAll}
                        className="text-text-info hover:text-accent-1 text-xs font-semibold hover:underline cursor-pointer transition-colors"
                    >
                        Reset all
                    </button>
                )}
            </div>

            {/* Body / Groups */}
            <div className={cn('flex flex-col gap-4 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar', bodyClassName)}>
                {children}
            </div>

            {/* Footer Actions */}
            {(onClose || onApply) && (
                <div className="flex items-center gap-2 shrink-0 pt-1">
                    {onClose && (
                        <AppButton
                            variant="neutral"
                            size="sm"
                            className="flex-1"
                            onClick={onClose}
                        >
                            Close
                        </AppButton>
                    )}
                    {onApply && (
                        <AppButton
                            variant="accent"
                            size="sm"
                            className="flex-1 font-bold !bg-accent-1 !text-white hover:!opacity-90 transition-opacity shadow-sm"
                            onClick={onApply}
                        >
                            Apply
                        </AppButton>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <AppPopover
            content={content}
            open={open}
            onOpenChange={onOpenChange}
            placement={placement}
            {...props}
        >
            {trigger}
        </AppPopover>
    );
}

AppFilterPopover.Group = FilterGroup;
