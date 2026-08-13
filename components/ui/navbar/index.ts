import AppNavbarComponent from './AppNavbar';
import AppNavbarLeft from './AppNavbarLeft';
import AppNavbarCenter from './AppNavbarCenter';
import AppNavbarRight from './AppNavbarRight';
import AppNavbarItem from './AppNavbarItem';
import AppNavbarToggle from './AppNavbarToggle';
import AppNavbarSeparator from './AppNavbarSeparator';

type AppNavbarType = typeof AppNavbarComponent & {
    Left: typeof AppNavbarLeft;
    Center: typeof AppNavbarCenter;
    Right: typeof AppNavbarRight;
    Item: typeof AppNavbarItem;
    Toggle: typeof AppNavbarToggle;
    Separator: typeof AppNavbarSeparator;
};

const AppNavbar = AppNavbarComponent as AppNavbarType;

AppNavbar.Left = AppNavbarLeft;
AppNavbar.Center = AppNavbarCenter;
AppNavbar.Right = AppNavbarRight;
AppNavbar.Item = AppNavbarItem;
AppNavbar.Toggle = AppNavbarToggle;
AppNavbar.Separator = AppNavbarSeparator;

export { AppNavbar };
export { AppNavbarProvider, useNavbar } from './AppNavbarProvider';
export type { AppNavbarProps } from './AppNavbar';
export type { AppNavbarLeftProps } from './AppNavbarLeft';
export type { AppNavbarCenterProps } from './AppNavbarCenter';
export type { AppNavbarRightProps } from './AppNavbarRight';
export type { AppNavbarItemProps } from './AppNavbarItem';
export type { AppNavbarToggleProps } from './AppNavbarToggle';
export type { AppNavbarSeparatorProps } from './AppNavbarSeparator';
