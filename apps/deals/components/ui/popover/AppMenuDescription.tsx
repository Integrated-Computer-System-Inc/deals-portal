import React from 'react';

export interface DescriptionProps {
    children: React.ReactNode;
}

export function Description({ children }: DescriptionProps) {
    return <>{children}</>;
}
Description.displayName = 'AppMenuPanel.Description';
