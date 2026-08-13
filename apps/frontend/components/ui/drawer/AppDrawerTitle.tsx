import React from 'react';
import { AppLabel } from '../labels';
import type { AppLabelProps } from '../labels';
import { cn } from '../../utils/cn';

export interface AppDrawerTitleProps extends Omit<AppLabelProps<'h3'>, 'as' | 'type'> {
    children: React.ReactNode;
    size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const AppDrawerTitle: React.FC<AppDrawerTitleProps> = ({ className, children, size = 'xl', ...props }) => {
    const sizes = {
        sm: 'text-[13px]',
        base: 'text-sm md:text-base',
        lg: 'text-base md:text-lg',
        xl: 'text-lg md:text-xl',
        '2xl': 'text-xl md:text-2xl',
        '3xl': 'text-2xl md:text-3xl'
    };

    return (
        <AppLabel as="h3" variant="title" className={cn(sizes[size], className)} {...props}>
            {children}
        </AppLabel>
    );
};

AppDrawerTitle.displayName = 'AppDrawer.Title';
