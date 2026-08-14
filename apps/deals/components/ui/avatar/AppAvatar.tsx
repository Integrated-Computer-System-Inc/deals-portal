'use client';

import React, { useState, useEffect } from 'react';
import { Avatar } from 'antd';
import { cn } from '../../utils/cn';

export interface AppAvatarProps {
    src?: string;
    name?: string;
    size?: number;
    className?: string;
    alt?: string;
}

export function AppAvatar({ src, name = 'Guest User', size = 36, className, alt }: AppAvatarProps) {
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(src);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setAvatarUrl(src);
        setHasError(false);
    }, [src]);

    const getDicebearUrl = (seed: string) => {
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
    };

    const handleError = () => {
        if (!hasError) {
            setHasError(true);
            setAvatarUrl(getDicebearUrl(name));
        }
        return false;
    };

    const finalSrc = avatarUrl || getDicebearUrl(name);
    const initial = name.trim().charAt(0).toUpperCase() || 'U';

    return (
        <Avatar
            src={finalSrc}
            onError={handleError}
            size={size}
            alt={alt || name}
            className={cn("bg-neutral border border-border shadow-sm flex items-center justify-center shrink-0", className)}
        >
            {initial}
        </Avatar>
    );
}
