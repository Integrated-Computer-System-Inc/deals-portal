import React from 'react';

export interface ActionProps {
    children: React.ReactNode;
}

export function Action({ children }: ActionProps) {
    return <>{children}</>;
}
Action.displayName = 'AppMenuPanel.Action';
