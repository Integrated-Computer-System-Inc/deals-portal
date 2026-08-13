'use client';

import React, { useMemo, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { AppInput, AppInputProps } from './AppInput';

// Static assets
import visaLogo from './assets/visa.svg';
import mastercardLogo from './assets/mastercard.svg';
import amexLogo from './assets/american-express.svg';

export type CardType =
    | 'visa'
    | 'mastercard'
    | 'amex'
    | 'unknown';

export interface AppCardInputProps extends Omit<AppInputProps, 'preset' | 'rightIcon'> {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    error?: React.ReactNode;
    validateOnBlur?: boolean;
    validateOnChange?: boolean;
}

const CARD_FORMATS: Record<Exclude<CardType, 'unknown'>, number[]> = {
    visa: [4, 4, 4, 4],
    mastercard: [4, 4, 4, 4],
    amex: [4, 4, 4, 4],
};

export const detectCardType = (value: string): CardType => {
    const digits = value.replace(/\D/g, '');

    if (/^4/.test(digits)) {
        return 'visa';
    }

    if (
        /^5[1-5]/.test(digits) ||
        /^(222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(digits)
    ) {
        return 'mastercard';
    }

    if (/^3[47]/.test(digits)) {
        return 'amex';
    }

    return 'unknown';
};

export const formatCardNumber = (value: string, cardType: CardType): string => {
    const digits = value.replace(/\D/g, '');
    const format = CARD_FORMATS[cardType as Exclude<CardType, 'unknown'>] ?? [4, 4, 4, 4];

    let currentIndex = 0;
    return format
        .map(length => {
            const chunk = digits.slice(currentIndex, currentIndex + length);
            currentIndex += length;
            return chunk;
        })
        .filter(Boolean)
        .join(' ');
};

export const validateLuhn = (value: string): boolean => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue || cleanValue.length < 12) return false;
    
    let sum = 0;
    let shouldDouble = false;
    
    for (let i = cleanValue.length - 1; i >= 0; i--) {
        let digit = parseInt(cleanValue.charAt(i), 10);
        
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }
        
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    
    return sum % 10 === 0;
};

export const validateCardLength = (value: string, cardType: CardType): boolean => {
    const len = value.replace(/\D/g, '').length;
    return len === 16;
};

export const AppCardInput = React.forwardRef<any, AppCardInputProps>(
    (
        {
            value = '',
            onChange,
            onBlur,
            placeholder = '0000 0000 0000 0000',
            label = 'Card Number',
            error,
            validateOnBlur = true,
            validateOnChange = true,
            ...props
        },
        ref
    ) => {
        const [localError, setLocalError] = useState<string | null>(null);

        const cleanVal = useMemo(() => value.replace(/\D/g, ''), [value]);
        const cardType = useMemo(() => detectCardType(cleanVal), [cleanVal]);
        const formattedVal = useMemo(() => formatCardNumber(cleanVal, cardType), [cleanVal, cardType]);

        const getMaxLength = (type: CardType): number => {
            return 16;
        };

        const performValidation = (val: string, type: CardType) => {
            const digits = val.replace(/\D/g, '');
            if (!digits) {
                setLocalError(null);
                return;
            }

            if (!validateCardLength(digits, type)) {
                setLocalError('Invalid card length');
                return;
            }

            if (!validateLuhn(digits)) {
                setLocalError('Invalid card number (checksum failed)');
                return;
            }

            setLocalError(null);
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const rawVal = e.target.value;
            const clean = rawVal.replace(/\D/g, '');
            const detectedType = detectCardType(clean);
            const maxDigits = getMaxLength(detectedType);
            const truncated = clean.slice(0, maxDigits);
            
            const formatted = formatCardNumber(truncated, detectedType);
            
            if (onChange) {
                const syntheticEvent = {
                    ...e,
                    target: {
                        ...e.target,
                        value: formatted,
                    },
                };
                onChange(syntheticEvent as any);
            }

            if (validateOnChange) {
                if (truncated.length === maxDigits) {
                    performValidation(truncated, detectedType);
                } else {
                    setLocalError(null);
                }
            } else {
                setLocalError(null);
            }
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            if (onBlur) {
                onBlur(e);
            }
            if (validateOnBlur) {
                performValidation(cleanVal, cardType);
            }
        };

        const rightIcon = useMemo(() => {
            switch (cardType) {
                case 'visa':
                    return <img src={visaLogo.src} alt="Visa" className="w-7 h-5 object-contain select-none" />;
                case 'mastercard':
                    return <img src={mastercardLogo.src} alt="Mastercard" className="w-7 h-5 object-contain select-none" />;
                case 'amex':
                    return <img src={amexLogo.src} alt="Amex" className="w-7 h-5 object-contain select-none" />;
                default:
                    return <CreditCard size={16} className="shrink-0" />;
            }
        }, [cardType]);

        const resolvedError = error || localError;

        return (
            <AppInput
                ref={ref}
                type="text"
                inputMode="numeric"
                label={label}
                placeholder={placeholder}
                value={formattedVal}
                onChange={handleChange}
                onBlur={handleBlur}
                rightIcon={rightIcon}
                suffixClassName="bg-transparent! border-l-0!"
                error={resolvedError}
                {...props}
            />
        );
    }
);

AppCardInput.displayName = 'AppCardInput';
