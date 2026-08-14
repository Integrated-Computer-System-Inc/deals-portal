import AppSidebarComponent from './AppSidebar';
import AppSidebarHeader from './AppSidebarHeader';
import AppSidebarContent from './AppSidebarContent';
import AppSidebarFooter from './AppSidebarFooter';
import AppSidebarGroup from './AppSidebarGroup';
import AppSidebarItem from './AppSidebarItem';
import AppSidebarToggle from './AppSidebarToggle';
import AppSidebarSeparator from './AppSidebarSeparator';

type AppSidebarType = typeof AppSidebarComponent & {
    Header: typeof AppSidebarHeader;
    Content: typeof AppSidebarContent;
    Footer: typeof AppSidebarFooter;
    Group: typeof AppSidebarGroup;
    Item: typeof AppSidebarItem;
    Toggle: typeof AppSidebarToggle;
    Separator: typeof AppSidebarSeparator;
};

const AppSidebar = AppSidebarComponent as AppSidebarType;

AppSidebar.Header = AppSidebarHeader;
AppSidebar.Content = AppSidebarContent;
AppSidebar.Footer = AppSidebarFooter;
AppSidebar.Group = AppSidebarGroup;
AppSidebar.Item = AppSidebarItem;
AppSidebar.Toggle = AppSidebarToggle;
AppSidebar.Separator = AppSidebarSeparator;

export { AppSidebar };
export { AppSidebarProvider, useSidebar } from './AppSidebarProvider';
export type { AppSidebarProps } from './AppSidebar';
export type { AppSidebarHeaderProps } from './AppSidebarHeader';
export type { AppSidebarContentProps } from './AppSidebarContent';
export type { AppSidebarFooterProps } from './AppSidebarFooter';
export type { AppSidebarGroupProps } from './AppSidebarGroup';
export type { AppSidebarItemProps } from './AppSidebarItem';
export type { AppSidebarToggleProps } from './AppSidebarToggle';
export type { AppSidebarSeparatorProps } from './AppSidebarSeparator';
