'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '../../utils/cn';
import { AppLabel } from '../labels';
import { Inbox, LucideIcon } from 'lucide-react';

export interface AppEmptyStateProps {
    title: string;
    description?: React.ReactNode;
    imageSrc?: string;
    imageSize?: number;
    icon?: LucideIcon;
    bordered?: boolean;
    className?: string;
}

export default function AppEmptyState({
    title,
    description,
    imageSrc,
    imageSize = 80,
    icon: Icon = Inbox,
    bordered = false,
    className,
}: AppEmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center gap-3 py-8 px-4 text-center",
                bordered && "rounded-2xl border border-dashed border-border/50 bg-background/40",
                className
            )}
        >
            {imageSrc ? (
                <Image
                    src={imageSrc}
                    alt={title}
                    width={imageSize}
                    height={imageSize}
                    className="opacity-80 object-contain"
                />
            ) : (
                <div className="text-muted-foreground/40 mb-1">
                    <Icon size={imageSize / 2} />
                </div>
            )}
            <div className="space-y-1">
                <AppLabel as="p" variant="title" className="text-sm md:text-base">
                    {title}
                </AppLabel>
                {description && (
                    <AppLabel as="p" variant="description" className="max-w-[240px] mx-auto text-[13px]">
                        {description}
                    </AppLabel>
                )}
            </div>
        </div>
    );
}
