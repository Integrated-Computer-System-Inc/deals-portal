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
        <div className={cn('w-[320px] max-h-[min(480px,calc(100vh-80px))] p-3 flex flex-col select-none bg-background border border-border rounded-xl shadow-2xl overflow-hidden', className)}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-2 shrink-0 bg-background z-10">
                <span className="font-bold text-foreground text-sm">{title}</span>
                {onResetAll && (
                    <button
                        type="button"
                        onClick={onResetAll}
                        className="text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:underline cursor-pointer transition-colors"
                    >
                        Reset all
                    </button>
                )}
            </div>

            {/* Body / Groups (Scrollable only in this container) */}
            <div className={cn('flex flex-col gap-3 overflow-y-auto pr-1 py-2 custom-scrollbar flex-1 min-h-0 max-h-[min(320px,calc(100vh-180px))]', bodyClassName)}>
                {children}
            </div>

            {/* Sticky Footer Actions - Fixed at bottom */}
            {(onClose || onApply) && (
                <div className="flex items-center gap-2 shrink-0 pt-2.5 border-t border-border/60 mt-auto bg-background/95 backdrop-blur-xs z-20">
                    {onClose && (
                        <button
                            type="button"
                            className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-foreground hover:bg-neutral transition"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    )}
                    {onApply && (
                        <button
                            type="button"
                            className="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:opacity-90 transition shadow-sm cursor-pointer"
                            onClick={onApply}
                        >
                            Apply Filters
                        </button>
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
