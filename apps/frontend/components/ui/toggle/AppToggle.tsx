'use client';

import React from 'react';
import { Segmented } from 'antd';

interface ToggleOption<T> {
  label: string;
  value: T;
}

interface AppToggleProps<T> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (val: T) => void;
  className?: string;
  size?: 'small' | 'middle' | 'large';
}

export function AppToggle<T extends string>({
  options,
  value,
  onChange,
  className,
  size,
}: AppToggleProps<T>) {
  return (
    <Segmented
      size={size}
      value={value}
      onChange={(val) => onChange(val as T)}
      options={options.map((o) => ({ label: o.label, value: o.value }))}
      className={className}
      style={{}}
      rootClassName="app-toggle"
    />
  );
}
