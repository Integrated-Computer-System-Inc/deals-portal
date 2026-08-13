'use client';

import React from 'react';
import { cn } from '../../utils/cn';

export interface AppModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export const AppModalFooter: React.FC<AppModalFooterProps> = ({ className, children, ...props }) => {
    return (
        <div className={cn('p-0 mt-4 flex items-center justify-end gap-3', className)} {...props}>
            {children}
        </div>
    );
};

AppModalFooter.displayName = 'AppModal.Footer';
