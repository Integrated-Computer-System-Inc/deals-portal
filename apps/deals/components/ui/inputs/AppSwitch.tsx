'use client';

import React from 'react';
import { Switch } from 'antd';

export interface AppSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
}

export function AppSwitch({ checked, onChange, disabled, className }: AppSwitchProps) {
    return (
        <div onClick={(e) => e.stopPropagation()} className="inline-flex">
            <Switch
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className={className}
            />
        </div>
    );
}
