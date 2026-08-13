'use client';

import React, { useContext } from 'react';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';
import { AppDrawerContext } from './AppDrawer';

export interface AppDrawerHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    showClose?: boolean;
    onClose?: () => void;
}

export const AppDrawerHeader: React.FC<AppDrawerHeaderProps> = ({
    className,
    children,
    showClose = true,
    onClose,
    ...props
}) => {
    const context = useContext(AppDrawerContext);
    const resolvedOnClose = onClose || context.onClose;

    return (
        <div className={cn('flex items-start justify-between gap-4 pb-4 mb-4 border-b border-border/40 shrink-0', className)} {...props}>
            <div className="flex flex-col gap-1 min-w-0 flex-1">
                {children}
            </div>
            {showClose && resolvedOnClose && (
                <button
                    type="button"
                    onClick={resolvedOnClose}
                    className="p-1.5 rounded-lg text-foreground/45 hover:text-foreground hover:bg-foreground/5 transition-colors border-0 bg-transparent cursor-pointer shrink-0 mt-0.5"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
};

AppDrawerHeader.displayName = 'AppDrawer.Header';
