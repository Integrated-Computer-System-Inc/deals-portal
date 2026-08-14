'use client';

import React from 'react';
import { Input, InputProps } from 'antd';
import { cn } from '../../utils/cn';
import { Loader2, Mail, Search, Phone, MapPin, Hash, Lock, User, Globe } from 'lucide-react';
import { AppField } from './AppField';

interface InputPreset {
    type?: string;
    label?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    placeholder?: string;
    className?: string;
    prefixClassName?: string;
    suffixClassName?: string;
}

type PresetKey =
    | 'email'
    | 'password'
    | 'search'
    | 'phone'
    | 'zip'
    | 'address'
    | 'username'
    | 'fname'
    | 'lname'
    | 'fullName'
    | 'telephone'
    | 'website';

const presets: Record<PresetKey, InputPreset> = {
    email: {
        type: 'email',
        label: 'Email',
        leftIcon: <Mail size={14} className="shrink-0" />,
        placeholder: 'Enter email...',
    },
    password: {
        type: 'password',
        label: 'Password',
        leftIcon: <Lock size={14} className="shrink-0" />,
        placeholder: 'Enter password...',
    },
    search: {
        type: 'search',
        rightIcon: <Search size={14} className="shrink-0" />,
        placeholder: 'Search...',
    },
    phone: {
        type: 'tel',
        label: 'Phone Number',
        leftIcon: <Phone size={14} className="shrink-0" />,
        placeholder: 'Enter phone number...',
    },
    zip: {
        type: 'text',
        label: 'ZIP Code',
        leftIcon: <Hash size={14} className="shrink-0" />,
        placeholder: '12345',
        className: 'w-full sm:w-36',
    },
    address: {
        type: 'text',
        label: 'Address',
        leftIcon: <MapPin size={14} className="shrink-0" />,
        placeholder: 'Enter address...',
    },
    username: {
        type: 'text',
        label: 'Username',
        leftIcon: <User size={14} className="shrink-0" />,
        placeholder: 'Enter username...',
    },
    fname: {
        type: 'text',
        label: 'First Name',
        leftIcon: <User size={14} className="shrink-0" />,
        placeholder: 'Enter first name...',
    },
    lname: {
        type: 'text',
        label: 'Last Name',
        leftIcon: <User size={14} className="shrink-0" />,
        placeholder: 'Enter last name...',
    },
    fullName: {
        type: 'text',
        label: 'Full Name',
        leftIcon: <User size={14} className="shrink-0" />,
        placeholder: 'Enter full name...',
    },
    telephone: {
        type: 'tel',
        label: 'Telephone',
        leftIcon: <Phone size={14} className="shrink-0" />,
        placeholder: 'Enter telephone number...',
    },
    website: {
        type: 'url',
        label: 'Website',
        leftIcon: <Globe size={14} className="shrink-0" />,
        placeholder: 'Enter website URL...',
    },
};

export interface AppInputProps extends Omit<InputProps, 'size'> {
    label?: React.ReactNode;
    labelRight?: React.ReactNode;
    hint?: React.ReactNode;
    error?: React.ReactNode;
    required?: boolean;
    size?: 'sm' | 'md' | 'lg';
    shape?: 'default' | 'pill';
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    loading?: boolean;
    preset?: PresetKey;
    prefixClassName?: string;
    suffixClassName?: string;
    onSearch?: (value: string) => void;
    onSuffixClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const AppInput = React.forwardRef<any, AppInputProps>(
    (
        {
            className,
            type,
            variant,
            label,
            labelRight,
            hint,
            error,
            required = false,
            placeholder,
            size = 'md',
            shape = 'default',
            leftIcon,
            rightIcon,
            loading = false,
            disabled,
            preset,
            prefixClassName,
            suffixClassName,
            onSearch,
            onSuffixClick,
            ...props
        },
        ref
    ) => {
        const config: InputPreset = preset ? presets[preset] : {};
        const resolvedType = type || config.type || 'text';
        const resolvedLabel = label !== undefined ? label : config.label;

        const isEmail = resolvedType === 'email' || (typeof resolvedLabel === 'string' && resolvedLabel.toLowerCase().includes('email'));
        const defaultLeftIcon = isEmail ? <Mail size={16} className="shrink-0" /> : undefined;
        const resolvedLeftIcon = leftIcon || config.leftIcon || defaultLeftIcon;

        const resolvedRightIcon = loading
            ? <Loader2 size={16} className="animate-spin shrink-0" />
            : (rightIcon || config.rightIcon);

        const defaultPlaceholder = typeof resolvedLabel === 'string' ? `Enter ${resolvedLabel.toLowerCase()}...` : undefined;
        const resolvedPlaceholder = placeholder || config.placeholder || defaultPlaceholder;

        const hasText = !!(props.value || props.defaultValue);

        const handleSuffixClick = (e: React.MouseEvent<HTMLDivElement>) => {
            if (preset === 'search' && onSearch) {
                e.stopPropagation();
                onSearch(String(props.value || ''));
            } else if (onSuffixClick) {
                e.stopPropagation();
                onSuffixClick(e);
            }
        };

        const resolvedClassName = cn(config.className, className);

        const renderPrefix = () => {
            if (!resolvedLeftIcon) return undefined;
            return (
                <div className={cn(
                    "flex items-center justify-center px-3.5 bg-text-info/10 dark:bg-text-info/20 border-r border-border/60 text-text transition-colors h-full",
                    config.prefixClassName,
                    prefixClassName
                )}>
                    {resolvedLeftIcon}
                </div>
            );
        };

        const renderSuffix = () => {
            if (!resolvedRightIcon) return undefined;
            const isSearchActive = preset === 'search' && hasText;
            return (
                <div 
                    onClick={handleSuffixClick}
                    className={cn(
                        "flex items-center justify-center px-3.5 bg-text-info/10 dark:bg-text-info/20 border-l border-border/60 text-text transition-colors h-full",
                        isSearchActive && "bg-accent-1! hover:bg-accent-1/90! border-l-0! text-white! cursor-pointer",
                        config.suffixClassName,
                        suffixClassName
                    )}
                >
                    {resolvedRightIcon}
                </div>
            );
        };

        const inputProps = {
            disabled,
            placeholder: resolvedPlaceholder,
            prefix: renderPrefix(),
            suffix: renderSuffix(),
            className: cn(
                "w-full transition-all text-foreground overflow-hidden",
                size === 'sm' && "h-8 text-xs [&_.ant-input]:text-xs [&_.ant-input]:!py-1 [&_.ant-input]:!px-2",
                size === 'md' && "h-10 text-sm [&_.ant-input]:text-sm [&_.ant-input]:!py-2 [&_.ant-input]:!px-3.5",
                size === 'lg' && "h-12 text-base [&_.ant-input]:text-base [&_.ant-input]:!py-3 [&_.ant-input]:!px-4",
                shape === 'pill' ? "rounded-full [&_.ant-input]:rounded-full" : "rounded-xl [&_.ant-input]:rounded-xl",
                "bg-neutral/50! border-border! hover:bg-neutral/80! hover:border-border!",
                "focus-within:bg-neutral/80! focus-within:border-accent-1! focus-within:ring-2! focus-within:ring-accent-1/40!",
                "[&.ant-input]:bg-neutral/50 [&.ant-input]:border-border [&.ant-input]:hover:bg-neutral/80 [&.ant-input]:hover:border-border",
                "[&.ant-input]:focus:bg-neutral/80 [&.ant-input]:focus:border-accent-1 [&.ant-input]:focus:ring-2 [&.ant-input]:focus:ring-accent-1/40",
                "[&.ant-input-affix-wrapper_.ant-input]:bg-transparent! [&.ant-input-affix-wrapper_.ant-input]:border-0!",
                "[&_.ant-input::placeholder]:text-foreground/30",
                size === 'sm' && "[&_.ant-input-affix-wrapper_.ant-input]:!px-2.5",
                size === 'md' && "[&_.ant-input-affix-wrapper_.ant-input]:!px-3.5",
                size === 'lg' && "[&_.ant-input-affix-wrapper_.ant-input]:!px-4",
                (resolvedLeftIcon || resolvedRightIcon) && "py-0!",
                resolvedLeftIcon && "pl-0! [&_.ant-input-prefix]:h-full [&_.ant-input-prefix]:m-0! [&_.ant-input-prefix]:flex [&_.ant-input-prefix]:items-stretch [&_.ant-input-prefix]:pointer-events-auto",
                resolvedRightIcon && "pr-0! [&_.ant-input-suffix]:h-full [&_.ant-input-suffix]:m-0! [&_.ant-input-suffix]:flex [&_.ant-input-suffix]:items-stretch [&_.ant-input-suffix]:pointer-events-auto",
                error && "border-red-500/60! focus-within:border-red-500! focus-within:ring-red-500/30!",
                error && "[&.ant-input]:border-red-500/60 [&.ant-input]:focus:border-red-500 [&.ant-input]:focus:ring-red-500/30",
                disabled && "opacity-40 pointer-events-none"
            ),
            ...props
        };

        const renderInput = () => {
            if (resolvedType === 'password') {
                return <Input.Password ref={ref} {...inputProps} />;
            }
            return <Input ref={ref} type={resolvedType} {...inputProps} />;
        };

        return (
            <AppField
                label={resolvedLabel}
                labelRight={labelRight}
                hint={hint}
                error={error}
                required={required}
                className={resolvedClassName}
            >
                {renderInput()}
            </AppField>
        );
    }
);

AppInput.displayName = 'AppInput';
