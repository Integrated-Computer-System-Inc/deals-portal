'use client';

import React from 'react';
import { cn } from '../../utils/cn';
import { AppLabel } from '../labels';

export interface AppFieldProps {
    label?: React.ReactNode;
    labelRight?: React.ReactNode;
    hint?: React.ReactNode;
    error?: React.ReactNode;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}

export const AppField = ({
    label,
    labelRight,
    hint,
    error,
    required = false,
    children,
    className,
}: AppFieldProps) => {
    return (
        <div className={cn('flex flex-col gap-1.5 w-full', className)}>
            {label && (
                <div className="flex items-center justify-between w-full mb-0.5">
                    <AppLabel as="label" className="uppercase tracking-widest text-text-info font-semibold text-[11px] block">
                        {label}
                        {required ? (
                            <span className="text-red-500 ml-1">*</span>
                        ) : (
                            <span className="normal-case italic text-[10px] text-foreground/40 font-normal ml-1.5">(optional)</span>
                        )}
                    </AppLabel>
                    {labelRight}
                </div>
            )}

            {children}

            {error ? (
                <AppLabel className="mt-0.5 text-[11px] text-red-600 dark:text-red-400">
                    {error}
                </AppLabel>
            ) : hint ? (
                <AppLabel variant="description" className="mt-0.5 text-[11px]">
                    {hint}
                </AppLabel>
            ) : null}
        </div>
    );
};

