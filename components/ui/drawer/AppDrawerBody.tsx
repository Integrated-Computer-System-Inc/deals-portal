import React from 'react';
import { cn } from '../../utils/cn';

export interface AppDrawerBodyProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export const AppDrawerBody: React.FC<AppDrawerBodyProps> = ({ className, children, ...props }) => {
    return (
        <div className={cn('relative w-full flex-1 overflow-y-auto pr-1 custom-scrollbar', className)} {...props}>
            {children}
        </div>
    );
};

AppDrawerBody.displayName = 'AppDrawer.Body';
