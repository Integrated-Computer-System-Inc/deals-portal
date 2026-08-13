import React from 'react';

export interface CategoryProps {
    id: string;
    label: string;
    icon?: React.ReactNode;
    children?: React.ReactNode;
}

export function Category({ children }: CategoryProps) {
    return <>{children}</>;
}
Category.displayName = 'AppMenuPanel.Category';
