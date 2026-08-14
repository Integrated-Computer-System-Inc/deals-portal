'use client';

import React from 'react';
import { InputNumber } from 'antd';
import type { InputNumberProps } from 'antd';
import { cn } from '../../utils/cn';

export interface AppInputNumberProps extends InputNumberProps {
    className?: string;
}

export const AppInputNumber: React.FC<AppInputNumberProps> = ({ className, ...props }) => {
    return (
        <InputNumber
            className={cn(
                "!rounded-xl !border-border !bg-background !h-10 !flex !items-center !w-full",
                className
            )}
            {...props}
        />
    );
};
