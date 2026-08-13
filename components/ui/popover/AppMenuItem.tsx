import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Title } from './AppMenuTitle';
import { Description } from './AppMenuDescription';
import { Action } from './AppMenuAction';

export interface ItemProps {
    icon?: React.ReactNode;
    onClick?: () => void;
    selected?: boolean;
    disabled?: boolean;
    searchText?: string;
    iconBgStyle?: React.CSSProperties;
    children?: React.ReactNode;
    className?: string;
}

export function Item({
    icon,
    onClick,
    selected = false,
    disabled = false,
    iconBgStyle,
    children,
    className,
}: ItemProps) {
    let titleNode: React.ReactNode = null;
    let descriptionNode: React.ReactNode = null;
    let actionNode: React.ReactNode = null;
    const remainingChildren: React.ReactNode[] = [];

    React.Children.forEach(children, child => {
        if (React.isValidElement(child)) {
            const type = child.type;
            const isTitle = type === Title || (type as any).displayName === 'AppMenuPanel.Title';
            const isDescription = type === Description || (type as any).displayName === 'AppMenuPanel.Description';
            const isAction = type === Action || (type as any).displayName === 'AppMenuPanel.Action';

            if (isTitle) {
                titleNode = child;
            } else if (isDescription) {
                descriptionNode = child;
            } else if (isAction) {
                actionNode = child;
            } else {
                remainingChildren.push(child);
            }
        } else {
            remainingChildren.push(child);
        }
    });

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'flex items-center justify-between w-full px-3 py-3 rounded-xl text-left transition-all duration-150 group',
                disabled
                    ? 'opacity-30 cursor-not-allowed text-foreground'
                    : selected
                        ? 'bg-accent-1/8 cursor-pointer'
                        : 'hover:bg-foreground/5 cursor-pointer',
                className
            )}
        >
            <div className="flex items-center gap-3 min-w-0">
                {icon && (
                    <span
                        className={cn(
                            'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                            disabled
                                ? 'bg-foreground/6 text-foreground/40'
                                : iconBgStyle
                                    ? 'text-white'
                                    : selected
                                        ? 'bg-accent-1/15 text-accent-1'
                                        : 'bg-foreground/6 text-foreground/60 group-hover:text-foreground/80'
                        )}
                        style={!disabled && iconBgStyle ? iconBgStyle : undefined}
                    >
                        {icon}
                    </span>
                )}
                <div className="flex flex-col min-w-0">
                    {titleNode && (
                        <span className={cn(
                            'text-[13px] font-semibold leading-tight truncate',
                            selected ? 'text-accent-1' : 'text-foreground'
                        )}>
                            {titleNode}
                        </span>
                    )}
                    {descriptionNode && (
                        <span className="text-[11.5px] text-foreground/40 leading-snug mt-0.5">
                            {descriptionNode}
                        </span>
                    )}
                    {remainingChildren}
                </div>
            </div>
            <span className={cn(
                'shrink-0 ml-3 transition-colors',
                disabled
                    ? 'text-foreground/20'
                    : selected
                        ? 'text-accent-1'
                        : 'text-foreground/25 group-hover:text-foreground/50'
            )}>
                {actionNode ? (
                    actionNode
                ) : selected ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8L7 12L13 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                ) : (
                    <Plus size={16} />
                )}
            </span>
        </button>
    );
}
Item.displayName = 'AppMenuPanel.Item';
