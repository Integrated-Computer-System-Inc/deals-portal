'use client';

import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../utils/cn';

// Import sub-components from their separate files
import { Category } from './AppMenuCategory';
import { Item } from './AppMenuItem';
import { Title } from './AppMenuTitle';
import { Description } from './AppMenuDescription';
import { Action } from './AppMenuAction';

export interface MenuPanelCategory {
    id: string;
    label: string;
    icon?: React.ReactNode;
}

export interface MenuPanelItem {
    key: string;
    icon?: React.ReactNode;
    label: React.ReactNode;
    searchText?: string;
    description?: string;
    onClick: () => void;
    selected?: boolean;
    disabled?: boolean;
    rightAction?: React.ReactNode;
    iconBgStyle?: React.CSSProperties;
}

export interface AppMenuPanelProps {
    categories?: MenuPanelCategory[];
    items?: Record<string, MenuPanelItem[]>;
    searchPlaceholder?: string;
    showSearch?: boolean;
    className?: string;
    maxHeight?: string | number;
    width?: string | number;
    standalone?: boolean;
    allowEmptyCategories?: boolean;
    onCategoryChange?: (categoryId: string) => void;
    children?: React.ReactNode;
}

interface CategoryNode {
    id: string;
    label: string;
    icon?: React.ReactNode;
    items: React.ReactElement[];
}

const extractText = (node: React.ReactNode): string => {
    if (!node) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractText).join(' ');
    if (React.isValidElement(node)) {
        return extractText((node.props as any).children);
    }
    return '';
};

export function AppMenuPanel({
    categories: propsCategories,
    items: propsItems,
    searchPlaceholder = 'Search',
    showSearch = true,
    className,
    maxHeight = 380,
    width = '100%',
    standalone = false,
    allowEmptyCategories = false,
    onCategoryChange,
    children,
}: AppMenuPanelProps) {
    // 1. Build unified CategoryNodes list from either props or children
    const categoryNodes = useMemo<CategoryNode[]>(() => {
        let nodes: CategoryNode[] = [];

        if (propsCategories && propsItems) {
            // Props-based path: Convert to CategoryNodes
            nodes = propsCategories.map(cat => {
                const rawItems = propsItems[cat.id] || [];
                const itemElements = rawItems.map(item => (
                    <Item
                        key={item.key}
                        onClick={item.onClick}
                        selected={item.selected}
                        disabled={item.disabled}
                        icon={item.icon}
                        iconBgStyle={item.iconBgStyle}
                        searchText={item.searchText}
                    >
                        <Title>{item.label}</Title>
                        {item.description && <Description>{item.description}</Description>}
                        {item.rightAction && <Action>{item.rightAction}</Action>}
                    </Item>
                ));
                return {
                    id: cat.id,
                    label: cat.label,
                    icon: cat.icon,
                    items: itemElements,
                };
            });
        } else {
            // Children-based path: Parse React.Children
            React.Children.forEach(children, child => {
                if (!React.isValidElement(child)) return;

                const isCategory = child.type === Category || (child.type as any).displayName === 'AppMenuPanel.Category';
                if (isCategory) {
                    const { id, label, icon, children: categoryChildren } = child.props as any;
                    const itemElements: React.ReactElement[] = [];
                    React.Children.forEach(categoryChildren, itemChild => {
                        if (React.isValidElement(itemChild)) {
                            itemElements.push(itemChild as React.ReactElement);
                        }
                    });
                    nodes.push({
                        id,
                        label,
                        icon,
                        items: itemElements,
                    });
                } else {
                    const isItem = child.type === Item || (child.type as any).displayName === 'AppMenuPanel.Item';
                    if (isItem) {
                        let defaultCat = nodes.find(n => n.id === 'default');
                        if (!defaultCat) {
                            defaultCat = { id: 'default', label: 'Default', items: [] };
                            nodes.push(defaultCat);
                        }
                        defaultCat.items.push(child as React.ReactElement);
                    }
                }
            });
        }

        return nodes;
    }, [propsCategories, propsItems, children]);

    const categoriesList = useMemo(() => {
        return categoryNodes.map(node => ({
            id: node.id,
            label: node.label,
            icon: node.icon,
        }));
    }, [categoryNodes]);

    const [activeCategory, setActiveCategory] = useState<string>(() => {
        return categoriesList.length > 0 ? categoriesList[0].id : '';
    });
    const [search, setSearch] = useState('');

    const handleCategorySelect = (catId: string) => {
        setActiveCategory(catId);
        setSearch('');
        if (onCategoryChange) {
            onCategoryChange(catId);
        }
    };

    const isEmptyCategory = (catId: string) => {
        const node = categoryNodes.find(n => n.id === catId);
        return !node || node.items.length === 0;
    };

    const allActiveItems = useMemo(() => {
        const activeNode = categoryNodes.find(n => n.id === activeCategory);
        return activeNode ? activeNode.items : [];
    }, [activeCategory, categoryNodes]);

    const filteredItems = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return allActiveItems;
        return allActiveItems.filter(item => {
            const searchText = ((item.props as any).searchText || '').toLowerCase();
            const childrenText = extractText((item.props as any).children).toLowerCase();
            return childrenText.includes(q) || searchText.includes(q);
        });
    }, [search, allActiveItems]);

    const panelStyle: React.CSSProperties = {
        width,
        maxHeight,
    };

    const showSidebar = categoriesList.length > 1;

    const containerClasses = cn(
        "flex select-none text-foreground",
        standalone
            ? "rounded-[22px] overflow-hidden shadow-xl border border-border bg-neutral w-full"
            : "w-full overflow-hidden",
        className
    );

    return (
        <div className={containerClasses} style={panelStyle}>
            {/* ── LEFT SIDEBAR ── */}
            {showSidebar && (
                <div className="flex flex-col w-[180px] shrink-0 border-r border-border py-2 bg-neutral/40">
                    {categoriesList.map(cat => {
                        const empty = isEmptyCategory(cat.id);
                        const disabled = empty && !allowEmptyCategories;
                        return (
                            <button
                                key={cat.id}
                                onMouseEnter={() => {
                                    if (!disabled) handleCategorySelect(cat.id);
                                }}
                                onClick={() => {
                                    if (!disabled) handleCategorySelect(cat.id);
                                }}
                                disabled={disabled}
                                className={cn(
                                    'flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium transition-all duration-150 text-left rounded-xl mx-2 my-0.5 group/cat',
                                    activeCategory === cat.id
                                        ? 'bg-foreground/10 text-foreground'
                                        : 'text-foreground/55 hover:text-foreground/80 hover:bg-foreground/5',
                                    disabled
                                        ? 'opacity-30 cursor-not-allowed'
                                        : 'cursor-pointer'
                                )}
                            >
                                {cat.icon && <span className="shrink-0 opacity-75">{cat.icon}</span>}
                                <span className="truncate flex-1">{cat.label}</span>
                                <span className="ml-auto shrink-0 opacity-35">
                                    {/* Chevron right — default */}
                                    <svg className="block group-hover/cat:hidden" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M4.5 9L7.5 6L4.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    {/* Arrow left — on hover */}
                                    <svg className="hidden group-hover/cat:block" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M7.5 3L4.5 6L7.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── RIGHT CONTENT ── */}
            <div className="flex flex-col flex-1 min-w-0 bg-background/20">
                {/* Search bar */}
                {showSearch && (
                    <div className="px-4 pt-3.5 pb-2.5 border-b border-border bg-neutral/20">
                        <div className="flex items-center gap-2 text-foreground/35">
                            <Search size={13} className="shrink-0" />
                            <input
                                autoFocus
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="flex-1 bg-transparent border-none outline-none text-[13px] text-foreground placeholder:text-foreground/30"
                            />
                        </div>
                    </div>
                )}

                {/* Items list */}
                <div className="flex-1 overflow-y-auto py-1.5 px-2">
                    {filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-8 text-foreground/30 text-[13px]">
                            <span>No items available</span>
                        </div>
                    ) : (
                        filteredItems
                    )}
                </div>
            </div>
        </div>
    );
}

export { Category, Item, Title, Description, Action };
