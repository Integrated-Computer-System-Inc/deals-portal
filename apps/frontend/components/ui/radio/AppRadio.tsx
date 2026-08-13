'use client';

import React from 'react';
import { cn } from '../../utils/cn';

export interface AppRadioProps {
    checked: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
}

export function AppRadio({ checked, onChange, disabled = false, className }: AppRadioProps) {
    return (
        <div
            onClick={(e) => {
                if (disabled) return;
                onChange?.(!checked);
            }}
            className={cn(
                "shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 select-none",
                disabled
                    ? "border-neutral bg-neutral/10 cursor-not-allowed opacity-50"
                    : checked
                        ? "border-accent-1"
                        : "border-gray-400 hover:border-gray-600 cursor-pointer",
                className
            )}
        >
            {checked && (
                <div
                    className={cn(
                        "w-2 h-2 rounded-full bg-accent-1 transition-all duration-200",
                        disabled && "bg-neutral"
                    )}
                />
            )}
        </div>
    );
}
