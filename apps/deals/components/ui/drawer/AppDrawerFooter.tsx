import React from 'react';
import { cn } from '../../utils/cn';

export interface AppDrawerFooterProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export const AppDrawerFooter: React.FC<AppDrawerFooterProps> = ({ className, children, ...props }) => {
    return (
        <div className={cn('flex items-center justify-end gap-3 pt-4 border-t border-border/40 mt-6 shrink-0', className)} {...props}>
            {children}
        </div>
    );
};

AppDrawerFooter.displayName = 'AppDrawer.Footer';
