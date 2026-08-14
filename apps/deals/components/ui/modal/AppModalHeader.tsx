'use client';

import React from 'react';
import { cn } from '../../utils/cn';

export interface AppModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export const AppModalHeader: React.FC<AppModalHeaderProps> = ({ className, children, ...props }) => {
    return (
        <div className={cn('flex flex-col gap-1 pb-2 mb-4', className)} {...props}>
            {children}
        </div>
    );
};

AppModalHeader.displayName = 'AppModal.Header';
