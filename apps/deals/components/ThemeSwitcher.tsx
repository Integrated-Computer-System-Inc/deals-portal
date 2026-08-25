'use client';

import React, { useEffect, useState } from 'react';
import {
  Palette,
  Moon,
  Sun,
  Check,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import {
  AppModal,
  AppModalHeader,
  AppModalTitle,
  AppModalBody,
  AppButton,
} from './ui';

export interface ThemeTile {
  id: string;
  name: string;
  category: 'light' | 'dark';
  bg: string;
  sidebar: string;
  card: string;
  primary: string;
  accent: string;
  text: string;
  border: string;
}

// Light modes prioritized first, followed by dark themes
const THEME_TILES: ThemeTile[] = [
  {
    id: 'default',
    name: 'Clean Light',
    category: 'light',
    bg: '#FFFFFF',
    sidebar: '#F8FAFC',
    card: '#FFFFFF',
    primary: '#0F2A44',
    accent: '#1677ff',
    text: '#111827',
    border: '#E2E8F0',
  },
  {
    id: 'cherry-blossom',
    name: 'Blossom Pink',
    category: 'light',
    bg: '#fff0f3',
    sidebar: '#ffe5ec',
    card: '#ffd6e0',
    primary: '#e11d48',
    accent: '#ff4d6d',
    text: '#3f222b',
    border: '#ffb3c1',
  },
  {
    id: 'dark-default',
    name: 'Modern Dark',
    category: 'dark',
    bg: '#26282d',
    sidebar: '#2a2c33',
    card: '#1f2126',
    primary: '#3b82f6',
    accent: '#3b82f6',
    text: '#f5f6f8',
    border: '#383b42',
  },
  {
    id: 'ocean',
    name: 'Ocean Slate',
    category: 'dark',
    bg: '#1a2b3c',
    sidebar: '#142230',
    card: '#203347',
    primary: '#0284c7',
    accent: '#3b82f6',
    text: '#FFFFFF',
    border: '#2f4862',
  },
  {
    id: 'copper-teal',
    name: 'Forest Teal',
    category: 'dark',
    bg: '#0d3a3d',
    sidebar: '#082c2f',
    card: '#1b5d62',
    primary: '#0d9488',
    accent: '#e07a5f',
    text: '#FFFFFF',
    border: '#2a7277',
  },
  {
    id: 'coffee',
    name: 'Espresso',
    category: 'dark',
    bg: '#3d2f2b',
    sidebar: '#2b1e1b',
    card: '#4c3b37',
    primary: '#ca8a04',
    accent: '#48c0a4',
    text: '#FFFFFF',
    border: '#604b47',
  },
];

const SCALE_PRESETS = [
  { label: 'Compact', value: 85 },
  { label: 'Slim', value: 95 },
  { label: 'Default', value: 100 },
  { label: 'Comfortable', value: 110 },
  { label: 'Large', value: 120 },
  { label: 'X-Large', value: 130 },
];

export default function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('dark-default');
  const [isDark, setIsDark] = useState(true);
  const [fontScale, setFontScale] = useState(100);

  useEffect(() => {
    const savedTheme = localStorage.getItem('dealreg-color-theme') || 'dark-default';
    const savedDark = localStorage.getItem('dealreg-dark-mode') !== 'false';
    const savedScale = parseInt(localStorage.getItem('dealreg-font-scale') || '100', 10);

    setCurrentTheme(savedTheme);
    setIsDark(savedDark);
    setFontScale(isNaN(savedScale) ? 100 : savedScale);

    applyTheme(savedTheme, savedDark);
    applyFontScale(isNaN(savedScale) ? 100 : savedScale);
  }, []);

  const applyTheme = (themeId: string, darkState: boolean) => {
    if (themeId === 'dark-default') {
      document.documentElement.removeAttribute('data-color-theme');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      return;
    }

    if (themeId === 'default') {
      document.documentElement.removeAttribute('data-color-theme');
      if (darkState) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.removeAttribute('data-theme');
      }
      return;
    }

    document.documentElement.setAttribute('data-color-theme', themeId);
    if (darkState) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme');
    }
  };

  const applyFontScale = (scaleValue: number) => {
    const clamped = Math.min(140, Math.max(75, scaleValue));
    document.documentElement.style.fontSize = `${clamped}%`;
  };

  const handleSelectTheme = (theme: ThemeTile) => {
    setCurrentTheme(theme.id);
    localStorage.setItem('dealreg-color-theme', theme.id);

    const isThemeDark = theme.category === 'dark';
    setIsDark(isThemeDark);
    localStorage.setItem('dealreg-dark-mode', String(isThemeDark));

    applyTheme(theme.id, isThemeDark);
  };

  const handleScaleChange = (scaleValue: number) => {
    const clamped = Math.min(140, Math.max(75, scaleValue));
    setFontScale(clamped);
    localStorage.setItem('dealreg-font-scale', String(clamped));
    applyFontScale(clamped);
  };

  const resetScale = () => {
    handleScaleChange(100);
  };

  const toggleQuickDark = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    localStorage.setItem('dealreg-dark-mode', String(nextDark));

    if (nextDark) {
      if (currentTheme === 'default') {
        setCurrentTheme('dark-default');
        localStorage.setItem('dealreg-color-theme', 'dark-default');
        applyTheme('dark-default', true);
      } else {
        applyTheme(currentTheme, true);
      }
    } else {
      if (currentTheme === 'dark-default') {
        setCurrentTheme('default');
        localStorage.setItem('dealreg-color-theme', 'default');
        applyTheme('default', false);
      } else {
        applyTheme(currentTheme, false);
      }
    }
  };

  const activeTheme = THEME_TILES.find((t) => t.id === currentTheme) || THEME_TILES[0];

  return (
    <>
      {/* Trigger Button in Sidebar Footer */}
      <AppButton
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="text-muted hover:text-foreground hover:bg-neutral shrink-0 h-9 w-9 flex items-center justify-center rounded-lg relative transition mx-auto cursor-pointer"
        title="Change Theme, Font Size & UI Scale"
        aria-label="Change Theme"
        leftIcon={
          <div className="relative flex items-center justify-center">
            <Palette size={16} className="text-sky-500" />
            <span
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full ring-1 ring-background shadow-xs"
              style={{ backgroundColor: activeTheme.accent }}
            />
          </div>
        }
      />

      {/* Unified Single-View Theme & Font Scaling Modal */}
      <AppModal open={isOpen} onClose={() => setIsOpen(false)} width={660}>
        <AppModalHeader>
          <div className="flex items-center justify-between w-full pr-8">
            <AppModalTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Sparkles className="w-5 h-5 text-sky-500" />
              <span>Theme & Appearance</span>
            </AppModalTitle>

            {/* Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleQuickDark}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral border border-border text-xs font-semibold text-foreground hover:border-sky-500 transition shadow-xs cursor-pointer"
            >
              {isDark ? (
                <>
                  <Moon className="w-4 h-4 text-sky-400" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light Mode</span>
                </>
              )}
            </button>
          </div>
        </AppModalHeader>

        <AppModalBody className="pt-3 pb-3 space-y-4">
          {/* Real-time Font & Page Scaling Adjuster */}
          <div className="p-3.5 rounded-2xl bg-neutral/40 border border-border/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-500" />
                <span className="text-xs font-bold text-foreground">Page & Font Scale</span>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-300 font-mono font-bold text-[11px] border border-sky-500/20">
                  {fontScale}%
                </span>
              </div>

              <button
                type="button"
                onClick={resetScale}
                disabled={fontScale === 100}
                className="flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-foreground disabled:opacity-40 transition cursor-pointer"
                title="Reset to 100% default"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset (100%)</span>
              </button>
            </div>

            {/* Range Slider */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleScaleChange(fontScale - 5)}
                disabled={fontScale <= 75}
                className="p-1.5 rounded-lg bg-background border border-border hover:bg-neutral text-foreground transition disabled:opacity-30 cursor-pointer"
                title="Decrease font size"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min="75"
                max="135"
                step="5"
                value={fontScale}
                onChange={(e) => handleScaleChange(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-neutral rounded-lg appearance-none cursor-pointer accent-sky-500"
              />

              <button
                type="button"
                onClick={() => handleScaleChange(fontScale + 5)}
                disabled={fontScale >= 135}
                className="p-1.5 rounded-lg bg-background border border-border hover:bg-neutral text-foreground transition disabled:opacity-30 cursor-pointer"
                title="Increase font size"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scale Presets Grid */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {SCALE_PRESETS.map((preset) => {
                const isActive = fontScale === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleScaleChange(preset.value)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-sky-500 text-white font-bold shadow-xs'
                        : 'bg-background hover:bg-neutral border border-border text-muted hover:text-foreground'
                    }`}
                  >
                    {preset.label} ({preset.value}%)
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Themes Grid */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider block px-0.5">
              Color Themes
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {THEME_TILES.map((theme) => {
                const isSelected = currentTheme === theme.id;

                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectTheme(theme)}
                    className={`group relative p-2.5 rounded-2xl border transition-all flex flex-col items-center gap-2.5 cursor-pointer text-left ${
                      isSelected
                        ? 'border-sky-500 ring-2 ring-sky-500/30 bg-sky-500/10'
                        : 'border-border hover:border-sky-400/60 bg-neutral/50 hover:bg-neutral'
                    }`}
                    title={theme.name}
                  >
                    {/* Miniature Window Mockup */}
                    <div
                      className="w-full h-20 rounded-xl overflow-hidden border flex flex-col select-none shadow-xs group-hover:scale-[1.02] transition-transform"
                      style={{
                        backgroundColor: theme.bg,
                        borderColor: theme.border,
                      }}
                    >
                      {/* Window Titlebar */}
                      <div
                        className="h-4 px-2 flex items-center justify-between border-b shrink-0"
                        style={{
                          backgroundColor: theme.sidebar,
                          borderColor: theme.border,
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        </div>
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: theme.accent }}
                        />
                      </div>

                      {/* Window Body */}
                      <div className="flex-1 flex overflow-hidden">
                        <div
                          className="w-5 p-1 border-r shrink-0 flex flex-col gap-1"
                          style={{
                            backgroundColor: theme.sidebar,
                            borderColor: theme.border,
                          }}
                        >
                          <div
                            className="h-1 rounded"
                            style={{ backgroundColor: theme.accent }}
                          />
                          <div
                            className="h-1 rounded opacity-40"
                            style={{ backgroundColor: theme.text }}
                          />
                        </div>

                        <div className="flex-1 p-1.5 space-y-1 overflow-hidden">
                          <div className="grid grid-cols-2 gap-1">
                            <div
                              className="h-4 rounded border"
                              style={{
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                              }}
                            />
                            <div
                              className="h-4 rounded border"
                              style={{
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Theme Label */}
                    <div className="w-full flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: theme.accent }}
                        />
                        <span className="text-xs font-bold text-foreground truncate">
                          {theme.name}
                        </span>
                      </div>

                      {isSelected ? (
                        <div className="h-4 w-4 rounded-full bg-sky-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted font-medium capitalize">
                          {theme.category}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </AppModalBody>
      </AppModal>
    </>
  );
}
