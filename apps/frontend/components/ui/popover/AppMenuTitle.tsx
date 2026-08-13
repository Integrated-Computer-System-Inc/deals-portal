import React from 'react';

export interface TitleProps {
    children: React.ReactNode;
}

export function Title({ children }: TitleProps) {
    return <>{children}</>;
}
Title.displayName = 'AppMenuPanel.Title';
