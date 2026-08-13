'use client';

import React from 'react';
import { AppLabel } from '../labels';
import type { AppLabelProps } from '../labels';
import { cn } from '../../utils/cn';

export interface AppModalDescriptionProps extends Omit<AppLabelProps<'p'>, 'as' | 'type'> {
    children: React.ReactNode;
}

export const AppModalDescription: React.FC<AppModalDescriptionProps> = ({ className, children, ...props }) => {
    return (
        <AppLabel as="p" variant="description" className={cn('text-xs font-normal', className)} {...props}>
            {children}
        </AppLabel>
    );
};

AppModalDescription.displayName = 'AppModal.Description';
