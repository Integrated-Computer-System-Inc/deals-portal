'use client';

import React from 'react';
import { AppLabel } from '../labels';
import { cn } from '../../utils/cn';

export interface TabItem {
    id: string;
    label: string | React.ReactNode;
    icon?: React.ComponentType<any>;
    group?: string;
}

export interface AppTabsProps {
    tabs: TabItem[];
    activeTab: string;
    onChange: (tabId: any) => void;
    orientation?: 'horizontal' | 'vertical';
    variant?: 'pills' | 'underlined';
    fullWidth?: boolean;
    title?: string | React.ReactNode;
    className?: string;
    titleClassName?: string;
    navClassName?: string;
    tabClassName?: string;
    activeTabClassName?: string;
    inactiveTabClassName?: string;
    groupTitleClassName?: string;
}

export const AppTabs: React.FC<AppTabsProps> = ({
    tabs,
    activeTab,
    onChange,
    orientation = 'horizontal',
    variant = 'pills',
    fullWidth = false,
    title,
    className,
    titleClassName,
    navClassName,
    tabClassName,
    activeTabClassName,
    inactiveTabClassName,
    groupTitleClassName,
}) => {
    // Group tabs by their group field while preserving their relative order of appearance
    const groups: { name: string; items: TabItem[] }[] = [];
    tabs.forEach((tab) => {
        const groupName = tab.group || 'default';
        let group = groups.find((g) => g.name === groupName);
        if (!group) {
            group = { name: groupName, items: [] };
            groups.push(group);
        }
        group.items.push(tab);
    });

    const isUnderlined = variant === 'underlined';

    return (
        <div
            className={cn(
                isUnderlined
                    ? 'w-full bg-transparent flex flex-col shrink-0'
                    : orientation === 'vertical'
                    ? 'w-full md:w-[240px] bg-neutral border-b md:border-b-0 md:border-r border-border flex flex-col shrink-0'
                    : 'w-full bg-background border-b border-border flex flex-col shrink-0',
                className
            )}
        >
            {title && (
                <div
                    className={cn(
                        orientation === 'vertical'
                            ? 'px-4 md:px-5 pt-5 md:pt-6 pb-2 md:pb-4 pr-12'
                            : 'px-4 py-3',
                        titleClassName
                    )}
                >
                    {typeof title === 'string' ? (
                        <AppLabel as="h2" variant="title">
                            {title}
                        </AppLabel>
                    ) : (
                        title
                    )}
                </div>
            )}

            <nav
                className={cn(
                    isUnderlined
                        ? cn(
                              'flex flex-row border-b border-border select-none overflow-x-auto scrollbar-hide mb-4 mt-1',
                              !fullWidth && 'gap-6'
                          )
                        : 'flex gap-1.5 px-3 pb-3 select-none overflow-x-auto scrollbar-hide',
                    !isUnderlined &&
                        (orientation === 'vertical'
                            ? 'flex-row md:flex-col md:pb-6 md:px-3 md:flex-1'
                            : 'flex-row items-center gap-6'),
                    fullWidth && 'w-full',
                    navClassName
                )}
            >
                {groups.map((group, groupIdx) => (
                    <React.Fragment key={group.name}>
                        <div
                            className={cn(
                                'flex gap-1.5',
                                orientation === 'vertical' ? 'flex-col' : 'flex-col gap-1',
                                fullWidth && 'flex-1'
                            )}
                        >
                            {group.name !== 'default' && (
                                <div
                                    className={cn(
                                        'text-[10px] font-bold text-foreground/40 uppercase tracking-wider',
                                        orientation === 'vertical'
                                            ? 'hidden md:block px-3.5 pt-4 pb-1 first:mt-0 mt-2'
                                            : 'px-1',
                                        groupTitleClassName
                                    )}
                                >
                                    {group.name}
                                </div>
                            )}
                            <div
                                className={cn(
                                    'flex gap-1.5',
                                    orientation === 'vertical'
                                        ? 'flex-row md:flex-col'
                                        : 'flex-row',
                                    fullWidth && 'w-full flex-1'
                                )}
                            >
                                {group.items.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;

                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => onChange(tab.id)}
                                            className={cn(
                                                isUnderlined
                                                    ? cn(
                                                          'py-2 text-center text-sm font-semibold border-b-2 transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap border-transparent rounded-none',
                                                          fullWidth ? 'flex-1' : 'flex-none px-1'
                                                      )
                                                    : cn(
                                                          'flex items-center gap-2 md:gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap border border-transparent',
                                                          fullWidth ? 'flex-1 justify-center' : 'flex-none'
                                                      ),
                                                isActive
                                                    ? isUnderlined
                                                        ? 'border-accent-1 text-accent-1 font-semibold'
                                                        : 'bg-accent-1/10 text-accent-1 dark:bg-accent-1/25 border-accent-1/15 shadow-sm font-semibold'
                                                    : isUnderlined
                                                    ? 'text-gray-400 hover:text-foreground'
                                                    : 'text-foreground/60 hover:text-foreground hover:bg-neutral/60',
                                                tabClassName,
                                                isActive ? activeTabClassName : inactiveTabClassName
                                            )}
                                        >
                                            {Icon && (
                                                <Icon
                                                    size={18}
                                                    className={cn(
                                                        isActive
                                                            ? 'text-accent-1'
                                                            : 'text-foreground/45 transition-colors'
                                                    )}
                                                />
                                            )}
                                            <span>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {orientation === 'horizontal' && groupIdx < groups.length - 1 && (
                            <div className="h-8 w-px bg-border/60 shrink-0 self-end mb-2" />
                        )}
                    </React.Fragment>
                ))}
            </nav>
        </div>
    );
};

AppTabs.displayName = 'AppTabs';
