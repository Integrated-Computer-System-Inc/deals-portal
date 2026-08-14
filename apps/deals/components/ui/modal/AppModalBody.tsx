'use client';

import React from 'react';
import { cn } from '../../utils/cn';

export interface AppModalBodyProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export const AppModalBody: React.FC<AppModalBodyProps> = ({ className, children, ...props }) => {
    return (
        <div className={cn('p-0', className)} {...props}>
            {children}
        </div>
    );
};

AppModalBody.displayName = 'AppModal.Body';
