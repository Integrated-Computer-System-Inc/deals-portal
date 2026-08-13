import React from 'react';
import { AppLabel } from '../labels';
import type { AppLabelProps } from '../labels';
import { cn } from '../../utils/cn';

export interface AppDrawerDescriptionProps extends Omit<AppLabelProps<'p'>, 'as'> {
    children: React.ReactNode;
}

export const AppDrawerDescription: React.FC<AppDrawerDescriptionProps> = ({ className, children, ...props }) => {
    return (
        <AppLabel as="p" variant="description" className={cn('text-xs md:text-sm font-normal text-foreground/45 mt-0.5', className)} {...props}>
            {children}
        </AppLabel>
    );
};

AppDrawerDescription.displayName = 'AppDrawer.Description';
