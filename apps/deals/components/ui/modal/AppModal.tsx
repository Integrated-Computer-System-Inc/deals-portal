'use client';

import React from 'react';
import { Modal } from 'antd';
import type { ModalProps } from 'antd';
import { AppLabel } from '../labels';
import { cn } from '../../utils/cn';

import { AppModalHeader } from './AppModalHeader';
import type { AppModalHeaderProps } from './AppModalHeader';
import { AppModalTitle } from './AppModalTitle';
import type { AppModalTitleProps } from './AppModalTitle';
import { AppModalDescription } from './AppModalDescription';
import type { AppModalDescriptionProps } from './AppModalDescription';
import { AppModalBody } from './AppModalBody';
import type { AppModalBodyProps } from './AppModalBody';
import { AppModalFooter } from './AppModalFooter';
import type { AppModalFooterProps } from './AppModalFooter';

export { AppModalHeader, AppModalTitle, AppModalDescription, AppModalBody, AppModalFooter };
export type {
    AppModalHeaderProps,
    AppModalTitleProps,
    AppModalDescriptionProps,
    AppModalBodyProps,
    AppModalFooterProps,
};

export interface AppModalProps extends Omit<ModalProps, 'title' | 'footer' | 'classNames'> {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    width?: ModalProps['width'];
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const AppModalRoot: React.FC<AppModalProps> = ({
    open,
    onClose,
    children,
    width = 540,
    className,
    centered = true,
    padding = 'md',
    ...props
}) => {
    const paddings = {
        none: 'p-0 overflow-hidden',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={null}
            footer={null}
            width={width}
            centered={centered}
            className={cn('app-modal', className)}
            classNames={{
                mask: 'backdrop-blur-sm bg-black/45 dark:bg-black/60',
                content: cn('!rounded-2xl border border-border bg-background shadow-2xl', paddings[padding]),
                header: 'bg-transparent border-0 mb-0 p-0',
                body: 'p-0',
                footer: 'p-0 mt-4',
            } as any}
            {...props}
        >
            {children}
        </Modal>
    );
};

export interface AppModalComponent {
    (props: AppModalProps): any;
    Header: React.FC<AppModalHeaderProps>;
    Title: React.FC<AppModalTitleProps>;
    Description: React.FC<AppModalDescriptionProps>;
    Body: React.FC<AppModalBodyProps>;
    Footer: React.FC<AppModalFooterProps>;
    displayName?: string;
}

export const AppModal = AppModalRoot as AppModalComponent;

AppModal.Header = AppModalHeader;
AppModal.Title = AppModalTitle;
AppModal.Description = AppModalDescription;
AppModal.Body = AppModalBody;
AppModal.Footer = AppModalFooter;

AppModal.displayName = 'AppModal';


