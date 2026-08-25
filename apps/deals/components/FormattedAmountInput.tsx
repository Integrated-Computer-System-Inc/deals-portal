'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface FormattedAmountInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: number | string;
  onChange?: (value: number) => void;
  error?: boolean | string;
  allowDecimals?: boolean;
}

export function formatNumberWithCommas(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '';
  const str = String(val).replace(/,/g, '');
  if (isNaN(Number(str)) && str !== '.') return '';
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

export default function FormattedAmountInput({
  value,
  onChange,
  error,
  allowDecimals = true,
  className = '',
  disabled = false,
  placeholder = '0.00',
  ...props
}: FormattedAmountInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (value === undefined || value === null || value === '') return '';
    return formatNumberWithCommas(value);
  });

  const isControlledRef = useRef(false);

  useEffect(() => {
    // Sync external value changes (e.g. form reset or pre-fill)
    if (value === undefined || value === null || value === '') {
      setDisplayValue('');
      return;
    }
    const currentNum = parseFloat(displayValue.replace(/,/g, ''));
    const propNum = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
    if (isNaN(currentNum) || currentNum !== propNum) {
      setDisplayValue(formatNumberWithCommas(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (!rawVal.trim()) {
      setDisplayValue('');
      onChange?.(0);
      return;
    }

    // Filter characters: only allow numbers and one decimal dot (if allowed)
    let sanitized = allowDecimals ? rawVal.replace(/[^0-9.]/g, '') : rawVal.replace(/[^0-9]/g, '');
    
    // Allow only single decimal point
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }

    const dotIndex = sanitized.indexOf('.');
    const integerPart = dotIndex >= 0 ? sanitized.slice(0, dotIndex) : sanitized;
    const decimalPart = dotIndex >= 0 ? sanitized.slice(dotIndex) : '';

    const formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const nextDisplay = formattedInt + decimalPart;

    setDisplayValue(nextDisplay);

    const numericValue = parseFloat(sanitized);
    onChange?.(isNaN(numericValue) ? 0 : numericValue);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (displayValue && !isNaN(parseFloat(displayValue.replace(/,/g, '')))) {
      const num = parseFloat(displayValue.replace(/,/g, ''));
      setDisplayValue(formatNumberWithCommas(num));
    }
    props.onBlur?.(e);
  };

  return (
    <input
      type="text"
      inputMode={allowDecimals ? 'decimal' : 'numeric'}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder={placeholder}
      onWheel={(e) => e.currentTarget.blur()}
      className={`w-full px-3 py-2 bg-background border rounded-lg text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-2 transition ${
        error
          ? '!border-rose-500 !ring-2 !ring-rose-500/30 !bg-rose-500/5'
          : 'border-border focus:ring-primary/20'
      } ${disabled ? 'opacity-75 bg-neutral/30' : ''} ${className}`}
      {...props}
    />
  );
}
