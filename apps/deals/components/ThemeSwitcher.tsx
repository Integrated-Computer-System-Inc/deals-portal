'use client';

import React, { useEffect, useState } from 'react';
import { Palette, Moon, Sun, Check } from 'lucide-react';
import { AppDropdown, AppButton } from './ui';

const THEMES = [
  { id: 'default', name: 'Default', color: '#0F2A44' },
  { id: 'ocean', name: 'Ocean', color: '#0284c7' },
  { id: 'copper-teal', name: 'Copper Teal', color: '#0d9488' },
  { id: 'lavender', name: 'Lavender', color: '#8b5cf6' },
  { id: 'coffee', name: 'Warm Coffee', color: '#ca8a04' },
  { id: 'cherry-blossom', name: 'Cherry Blossom', color: '#ff4d6d' },
];

export default function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState('ocean');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('dealreg-color-theme') || 'ocean';
    const savedDark = localStorage.getItem('dealreg-dark-mode') === 'true';

    setCurrentTheme(savedTheme);
    setIsDark(savedDark);

    document.documentElement.setAttribute('data-color-theme', savedTheme);
    if (savedDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem('dealreg-color-theme', themeId);
    document.documentElement.setAttribute('data-color-theme', themeId);
  };

  const toggleDarkMode = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('dealreg-dark-mode', String(newDark));
    if (newDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme');
    }
  };

  const menuItems = THEMES.map((theme) => ({
    key: theme.id,
    label: (
      <div
        className="flex items-center justify-between w-full min-w-[160px] py-1 text-xs font-medium cursor-pointer text-foreground"
        onClick={() => handleThemeChange(theme.id)}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded-full border border-border shadow-sm"
            style={{ backgroundColor: theme.color }}
          />
          <span>{theme.name}</span>
        </div>
        {currentTheme === theme.id && <Check className="w-3.5 h-3.5 text-accent-1" />}
      </div>
    ),
  }));

  return (
    <div className="flex items-center justify-between w-full">
      <AppDropdown
        items={menuItems}
        trigger={['click']}
        placement="bottomLeft"
      >
        <AppButton
          variant="ghost"
          size="sm"
          leftIcon={<Palette size={14} className="text-accent-1" />}
          className="text-xs text-muted hover:text-foreground font-medium"
        >
          Theme
        </AppButton>
      </AppDropdown>

      <AppButton
        variant="ghost"
        size="icon"
        onClick={toggleDarkMode}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDark ? (
          <Sun size={16} className="text-warning" />
        ) : (
          <Moon size={16} className="text-muted" />
        )}
      </AppButton>
    </div>
  );
}
