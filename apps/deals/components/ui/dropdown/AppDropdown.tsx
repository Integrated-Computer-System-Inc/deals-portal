'use client';

import React from 'react';
import { Dropdown, ConfigProvider } from 'antd';
import type { DropdownProps, MenuProps } from 'antd';
import { cn } from '../../utils/cn';

import { AppLabel } from '../labels';

export interface AppDropdownProps extends Omit<DropdownProps, 'menu'> {
    items: MenuProps['items'];
    onItemClick?: MenuProps['onClick'];
    menuProps?: Omit<MenuProps, 'items' | 'onClick'>;
}

export const AppDropdown: React.FC<AppDropdownProps> = ({
    items,
    onItemClick,
    menuProps,
    trigger = ['click'],
    placement = 'bottomRight',
    overlayClassName,
    children,
    ...props
}) => {
    const styledItems = React.useMemo(() => {
        if (!items) return items;
        return items.map((item) => {
            if (!item) return item;
            if ('type' in item && (item.type === 'divider' || item.type === 'group')) {
                return item;
            }
            return {
                ...item,
                label: typeof item.label === 'string' ? (
                    <AppLabel as="span" variant="label" className="text-inherit !font-medium text-[13px]">
                        {item.label}
                    </AppLabel>
                ) : (
                    item.label
                ),
                className: cn(
                    '!rounded-lg !py-2 !px-3 !m-0.5 !text-[13px] !font-medium !transition-colors !duration-200',
                    item.className
                ),
            };
        });
    }, [items]);

    return (
        <ConfigProvider
            theme={{
                components: {
                    Dropdown: {
                        colorBgElevated: 'var(--background)',
                    },
                    Menu: {
                        colorBgElevated: 'var(--background)',
                        itemHoverBg: 'var(--hover-bg)',
                    },
                },
            }}
        >
            <Dropdown
                trigger={trigger}
                placement={placement}
                classNames={{
                    root: overlayClassName,
                }}
                menu={{
                    items: styledItems,
                    onClick: onItemClick,
                    className: cn(
                        '!bg-background !border !border-border/60 !shadow-xl !rounded-xl !p-1.5 !min-w-[160px] !font-sans',
                        menuProps?.className
                    ),
                    ...menuProps,
                }}
                {...props}
            >
                {children}
            </Dropdown>
        </ConfigProvider>
    );
};
