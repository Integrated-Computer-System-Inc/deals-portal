'use client';

import React from 'react';
import { Drawer } from 'antd';
import type { DrawerProps } from 'antd';
import { cn } from '../../utils/cn';

import { AppDrawerHeader } from './AppDrawerHeader';
import type { AppDrawerHeaderProps } from './AppDrawerHeader';
import { AppDrawerTitle } from './AppDrawerTitle';
import type { AppDrawerTitleProps } from './AppDrawerTitle';
import { AppDrawerDescription } from './AppDrawerDescription';
import type { AppDrawerDescriptionProps } from './AppDrawerDescription';
import { AppDrawerBody } from './AppDrawerBody';
import type { AppDrawerBodyProps } from './AppDrawerBody';
import { AppDrawerFooter } from './AppDrawerFooter';
import type { AppDrawerFooterProps } from './AppDrawerFooter';

export { AppDrawerHeader, AppDrawerTitle, AppDrawerDescription, AppDrawerBody, AppDrawerFooter };
export type {
    AppDrawerHeaderProps,
    AppDrawerTitleProps,
    AppDrawerDescriptionProps,
    AppDrawerBodyProps,
    AppDrawerFooterProps,
};

// Create the context for the close action
export const AppDrawerContext = React.createContext<{ onClose?: () => void }>({});

export interface AppDrawerProps extends Omit<DrawerProps, 'title' | 'footer' | 'classNames'> {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    width?: number | string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const AppDrawerRoot: React.FC<AppDrawerProps> = ({
    open,
    onClose,
    children,
    width = 460,
    className,
    padding = 'none',
    placement = 'right',
    ...props
}) => {
    const paddings = {
        none: 'p-0',
        sm: 'px-2',
        md: 'px-4',
        lg: 'px-6',
    };

    return (
        <AppDrawerContext.Provider value={{ onClose }}>
            <Drawer
                open={open}
                onClose={onClose}
                title={null}
                footer={null}
                size={width}
                closable={false}
                placement={placement}
                className={cn('app-drawer', className)}
                classNames={{
                    mask: 'backdrop-blur-sm bg-black/45 dark:bg-black/60',
                    section: cn(
                        'bg-background shadow-2xl h-full flex flex-col',
                        placement === 'right' && 'border-l border-border !rounded-l-2xl',
                        placement === 'left' && 'border-r border-border !rounded-r-2xl',
                        paddings[padding]
                    ),
                    header: 'hidden',
                    body: 'p-0 h-full flex flex-col overflow-hidden',
                    footer: 'p-0',
                } as any}
                {...props}
            >
                {children}
            </Drawer>
        </AppDrawerContext.Provider>
    );
};

export interface AppDrawerComponent {
    (props: AppDrawerProps): any;
    Header: React.FC<AppDrawerHeaderProps>;
    Title: React.FC<AppDrawerTitleProps>;
    Description: React.FC<AppDrawerDescriptionProps>;
    Body: React.FC<AppDrawerBodyProps>;
    Footer: React.FC<AppDrawerFooterProps>;
    displayName?: string;
}

export const AppDrawer = AppDrawerRoot as AppDrawerComponent;

AppDrawer.Header = AppDrawerHeader;
AppDrawer.Title = AppDrawerTitle;
AppDrawer.Description = AppDrawerDescription;
AppDrawer.Body = AppDrawerBody;
AppDrawer.Footer = AppDrawerFooter;

AppDrawer.displayName = 'AppDrawer';
