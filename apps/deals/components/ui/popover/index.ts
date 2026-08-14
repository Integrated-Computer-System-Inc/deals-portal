import { AppPopover } from './AppPopover';
import { AppMenuPanel as AppMenuPanelComponent } from './AppMenuPanel';
import { Category } from './AppMenuCategory';
import { Item } from './AppMenuItem';
import { Title } from './AppMenuTitle';
import { Description } from './AppMenuDescription';
import { Action } from './AppMenuAction';

type AppMenuPanelType = typeof AppMenuPanelComponent & {
    Category: typeof Category;
    Item: typeof Item;
    Title: typeof Title;
    Description: typeof Description;
    Action: typeof Action;
};

const AppMenuPanel = AppMenuPanelComponent as AppMenuPanelType;

AppMenuPanel.Category = Category;
AppMenuPanel.Item = Item;
AppMenuPanel.Title = Title;
AppMenuPanel.Description = Description;
AppMenuPanel.Action = Action;

export { AppPopover, AppMenuPanel };
export type { AppPopoverProps } from './AppPopover';
export type { AppMenuPanelProps, MenuPanelCategory, MenuPanelItem } from './AppMenuPanel';
export type { CategoryProps } from './AppMenuCategory';
export type { ItemProps } from './AppMenuItem';
export type { TitleProps } from './AppMenuTitle';
export type { DescriptionProps } from './AppMenuDescription';
export type { ActionProps } from './AppMenuAction';
