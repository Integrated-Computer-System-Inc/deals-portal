'use client';

import { useState } from 'react';

export interface Rule {
    required?: boolean;
    pattern?: RegExp;
    min?: number;
    max?: number;
    email?: boolean;
    message: string;
}

export type FormRules<T> = {
    [K in keyof T]?: Rule[];
};

export function useAppForm<T extends Record<string, any>>(initialValues: T, rules: FormRules<T>) {
    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

    const validateField = (value: any, fieldRules: Rule[]): string | undefined => {
        for (const rule of fieldRules) {
            if (rule.required && (value === undefined || value === null || String(value).trim() === '')) {
                return rule.message;
            }
            if (value !== undefined && value !== null && String(value).trim() !== '') {
                if (rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return rule.message;
                }
                if (rule.min && String(value).length < rule.min) {
                    return rule.message;
                }
                if (rule.max && String(value).length > rule.max) {
                    return rule.message;
                }
                if (rule.pattern && !rule.pattern.test(value)) {
                    return rule.message;
                }
            }
        }
        return undefined;
    };

    const setValue = (key: keyof T, value: any) => {
        setValues((prev) => ({ ...prev, [key]: value }));
        
        // Validate single field on change
        if (rules[key]) {
            const error = validateField(value, rules[key]!);
            setErrors((prev) => ({
                ...prev,
                [key]: error,
            }));
        }
    };

    const validateAll = (): boolean => {
        const newErrors: Partial<Record<keyof T, string>> = {};
        let isValid = true;

        for (const key in rules) {
            const fieldRules = rules[key];
            if (fieldRules) {
                const error = validateField(values[key], fieldRules);
                if (error) {
                    newErrors[key] = error;
                    isValid = false;
                }
            }
        }

        setErrors(newErrors);
        return isValid;
    };

    const resetForm = () => {
        setValues(initialValues);
        setErrors({});
    };

    return {
        values,
        errors,
        setValue,
        setErrors,
        validateAll,
        resetForm,
    };
}
