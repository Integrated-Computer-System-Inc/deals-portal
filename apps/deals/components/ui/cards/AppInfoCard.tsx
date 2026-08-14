'use client';

import React from 'react';
import { 
    Info, 
    AlertTriangle, 
    CheckCircle2, 
    XCircle 
} from 'lucide-react';
import { cn } from '../../utils/cn';

export type AppInfoCardVariant = 'info' | 'warning' | 'success' | 'danger';

export interface AppInfoCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
    variant?: AppInfoCardVariant;
    title?: React.ReactNode;
    description?: React.ReactNode;
    icon?: React.ComponentType<any> | React.ReactNode | null;
    showIcon?: boolean;
}

const defaultIcons: Record<AppInfoCardVariant, any> = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle2,
    danger: XCircle,
};

const variantStyles: Record<AppInfoCardVariant, {
    container: string;
    icon: string;
    title: string;
    description: string;
}> = {
    info: {
        container: 'bg-blue-50/70 border border-blue-200 text-blue-800',
        icon: 'text-blue-600',
        title: 'text-blue-900',
        description: 'text-blue-800/80',
    },
    warning: {
        container: 'bg-amber-50/70 border border-amber-200 text-amber-800',
        icon: 'text-amber-600',
        title: 'text-amber-900',
        description: 'text-amber-800/80',
    },
    success: {
        container: 'bg-green-50/70 border border-green-200 text-green-800',
        icon: 'text-green-600',
        title: 'text-green-900',
        description: 'text-green-800/80',
    },
    danger: {
        container: 'bg-red-50/70 border border-red-200 text-red-800',
        icon: 'text-red-600',
        title: 'text-red-900',
        description: 'text-red-800/80',
    },
};

export const AppInfoCard = React.forwardRef<HTMLDivElement, AppInfoCardProps>(
    (
        {
            className,
            variant = 'info',
            title,
            description,
            icon: customIcon,
            showIcon = true,
            children,
            ...props
        },
        ref
    ) => {
        const styles = variantStyles[variant];

        const renderIcon = () => {
            if (!showIcon) return null;

            if (customIcon === null) return null;

            if (customIcon) {
                if (typeof customIcon === 'function' || (customIcon as any).$$typeof) {
                    const CustomIconComponent = customIcon as React.ComponentType<{ size?: number; className?: string }>;
                    return <CustomIconComponent size={16} className={cn('shrink-0 mt-0.5', styles.icon)} />;
                }
                return <div className="shrink-0 mt-0.5">{customIcon}</div>;
            }

            const DefaultIconComponent = defaultIcons[variant];
            return <DefaultIconComponent size={16} className={cn('shrink-0 mt-0.5', styles.icon)} />;
        };

        return (
            <div
                ref={ref}
                className={cn(
                    'rounded-xl p-3.5 text-xs flex items-start gap-2.5 shadow-sm transition-all duration-200',
                    styles.container,
                    className
                )}
                {...props}
            >
                {renderIcon()}
                <div className="flex-1 space-y-1">
                    {title && (
                        <p className={cn('font-semibold', styles.title)}>
                            {title}
                        </p>
                    )}
                    {description && (
                        <div className={cn('leading-relaxed', styles.description)}>
                            {description}
                        </div>
                    )}
                    {children}
                </div>
            </div>
        );
    }
);

AppInfoCard.displayName = 'AppInfoCard';
