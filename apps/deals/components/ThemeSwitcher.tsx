'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Compass,
  X,
  ShoppingBag,
  Sliders,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Code2,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { AppModal, AppModalBody } from './ui/modal';
import { AppButton } from './ui/buttons';
import { AppTabs, TabItem } from './ui/tabs';
import { AppLabel } from './ui/labels';
import { useTour } from './tour/TourProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useDevMode } from './DevModeContext';
import { message } from 'antd';

export interface ColorThemeItem {
  id: string;
  name: string;
  sidebarBg: string;
  chatBg: string;
  accentBg: string;
}

export const COLOR_THEMES: ColorThemeItem[] = [
  {
    id: 'system',
    name: 'System',
    sidebarBg: '#FFFFFF',
    chatBg: '#F8FAFC',
    accentBg: '#64748b',
  },
  {
    id: 'light',
    name: 'Light',
    sidebarBg: '#FFFFFF',
    chatBg: '#F8FAFC',
    accentBg: '#64748b',
  },
  {
    id: 'dark',
    name: 'Dark',
    sidebarBg: '#141414',
    chatBg: '#212121',
    accentBg: '#3b82f6',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    sidebarBg: '#221523',
    chatBg: '#1f1220',
    accentBg: '#c084fc',
  },
  {
    id: 'copper-teal',
    name: 'Copper Teal',
    sidebarBg: '#082c2f',
    chatBg: '#0b3134',
    accentBg: '#e07a5f',
  },
  {
    id: 'coffee',
    name: 'Coffee',
    sidebarBg: '#2b1e1b',
    chatBg: '#352724',
    accentBg: '#48c0a4',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    sidebarBg: '#142230',
    chatBg: '#172635',
    accentBg: '#3b82f6',
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    sidebarBg: '#ffe5ec',
    chatBg: '#fff0f3',
    accentBg: '#ff4d6d',
  },
];

export const getPreviewColors = (id: string) => {
  if (id === 'system') {
    return { sidebarBg: '#FFFFFF', chatBg: '#eaeaea', accentBg: '#3b82f6' };
  }
  const found = COLOR_THEMES.find((t) => t.id === id);
  return found
    ? { sidebarBg: found.sidebarBg, chatBg: found.chatBg, accentBg: found.accentBg }
    : { sidebarBg: '#FFFFFF', chatBg: '#eaeaea', accentBg: '#3b82f6' };
};

interface ThemeCardProps {
  themeItem: ColorThemeItem;
  isSelected: boolean;
  onSelect: (themeId: string) => void;
}

export function ThemeCard({ themeItem, isSelected, onSelect }: ThemeCardProps) {
  const colors = getPreviewColors(themeItem.id);
  const isSystemTheme = themeItem.id === 'system';

  return (
    <div
      onClick={() => onSelect(themeItem.id)}
      className={`flex flex-col rounded-2xl border-2 transition-all cursor-pointer relative select-none overflow-hidden ${
        isSelected
          ? 'border-accent-1 bg-accent-1/10 shadow-xs'
          : 'border-transparent hover:border-border'
      }`}
    >
      {/* Theme Preview */}
      <div className="w-full h-24 relative overflow-hidden flex">
        {isSystemTheme ? (
          <>
            <div className="w-1/2 h-full bg-white border-r border-black/10">
              <div className="p-2 space-y-1.5 mt-3">
                <div className="w-full h-1.5 rounded-full bg-slate-200/80" />
                <div className="w-3/4 h-1.5 rounded-full bg-slate-200/80" />
                <div className="w-2/3 h-1.5 rounded-full bg-slate-200/80" />
              </div>
            </div>
            <div className="w-1/2 h-full text-white" style={{ backgroundColor: '#141414' }}>
              <div className="p-2 space-y-1.5 mt-3">
                <div className="w-full h-1.5 rounded-full bg-white/20" />
                <div className="w-3/4 h-1.5 rounded-full bg-white/20" />
                <div className="w-2/3 h-1.5 rounded-full bg-white/20" />
                <div className="flex gap-2 mt-3">
                  <div
                    className="w-8 h-5 rounded"
                    style={{ backgroundColor: colors.accentBg, opacity: 0.85 }}
                  />
                  <div className="w-8 h-5 rounded bg-white/20" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Sidebar preview */}
            <div
              className="w-[30%] h-full border-r"
              style={{ backgroundColor: colors.sidebarBg, borderColor: 'rgba(0,0,0,0.08)' }}
            >
              <div className="p-2 space-y-1.5 mt-3">
                <div
                  className="w-full h-1.5 rounded-full"
                  style={{ backgroundColor: colors.accentBg, opacity: 0.8 }}
                />
                <div className="w-3/4 h-1.5 rounded-full bg-gray-300/40" />
                <div className="w-2/3 h-1.5 rounded-full bg-gray-300/40" />
              </div>
            </div>
            {/* Content preview */}
            <div className="flex-1 h-full p-3" style={{ backgroundColor: colors.chatBg }}>
              <div className="space-y-2 mt-2">
                <div className="w-3/4 h-2 rounded-full bg-gray-300/30" />
                <div className="w-1/2 h-2 rounded-full bg-gray-300/30" />
                <div className="flex gap-2 mt-3">
                  <div
                    className="w-8 h-5 rounded"
                    style={{ backgroundColor: colors.accentBg, opacity: 0.7 }}
                  />
                  <div className="w-8 h-5 rounded bg-gray-300/30" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {/* Label */}
      <div className="flex items-center gap-2 px-3 py-2.5 w-full justify-between bg-neutral/10 border-t border-border/40 mt-auto">
        <AppLabel
          as="span"
          className={`text-xs font-bold leading-none truncate ${
            isSelected ? 'text-accent-1' : 'text-foreground/80'
          }`}
        >
          {themeItem.name}
        </AppLabel>
      </div>
    </div>
  );
}

const SCALE_PRESETS = [
  { label: 'XS', offset: -2, scalePercent: 85 },
  { label: 'Small', offset: -1, scalePercent: 92.5 },
  { label: 'Default', offset: 0, scalePercent: 100 },
  { label: 'Medium', offset: 1, scalePercent: 107.5 },
  { label: 'Large', offset: 2, scalePercent: 115 },
  { label: 'XL', offset: 3, scalePercent: 122.5 },
  { label: 'XXL', offset: 4, scalePercent: 130 },
];

export default function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [currentTheme, setCurrentTheme] = useState('system');
  const [fontOffset, setFontOffset] = useState(0);

  const { startTour } = useTour();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedTheme = localStorage.getItem('dealreg-color-theme') || 'system';
    const savedOffset = parseInt(localStorage.getItem('dealreg-font-offset') || '0', 10);

    setCurrentTheme(savedTheme);
    setFontOffset(isNaN(savedOffset) ? 0 : savedOffset);

    applyTheme(savedTheme);
    applyFontOffset(isNaN(savedOffset) ? 0 : savedOffset);
  }, []);

  const applyTheme = (themeId: string) => {
    document.documentElement.removeAttribute('data-color-theme');
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');

    if (themeId === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
      return;
    }

    if (themeId === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      return;
    }

    if (themeId === 'light') {
      return;
    }

    // Custom color themes (lavender, copper-teal, coffee, ocean, cherry-blossom)
    document.documentElement.setAttribute('data-color-theme', themeId);
    if (['lavender', 'copper-teal', 'coffee', 'ocean'].includes(themeId)) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  };

  const applyFontOffset = (offset: number) => {
    document.documentElement.style.fontSize = '';
    document.documentElement.style.setProperty('--font-scale', `${offset}px`);
  };

  const handleSelectTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem('dealreg-color-theme', themeId);
    applyTheme(themeId);
  };

  const handleOffsetChange = (offset: number) => {
    const clamped = Math.max(-2, Math.min(4, offset));
    setFontOffset(clamped);
    localStorage.setItem('dealreg-font-offset', String(clamped));
    applyFontOffset(clamped);
  };

  const handleStartGuidedTour = () => {
    setIsOpen(false);
    if (pathname !== '/dashboard') {
      router.push('/dashboard');
      setTimeout(() => {
        startTour('dashboard-tour');
      }, 300);
    } else {
      setTimeout(() => {
        startTour('dashboard-tour');
      }, 100);
    }
  };

  const { isDevMode, isITAdmin, toggleDevMode } = useDevMode();

  const handleDevModeToggle = () => {
    const nextState = !isDevMode;
    toggleDevMode();
    if (nextState) {
      message.success({
        content: 'Developer Mode ON: Right-click context menu & DevTools shortcuts enabled.',
        key: 'dev-mode-toast',
        duration: 3,
      });
    } else {
      message.info({
        content: 'Developer Mode OFF: Security protections active (Right-click & DevTools blocked).',
        key: 'dev-mode-toast',
        duration: 3,
      });
    }
  };

  const settingsTabs: TabItem[] = [
    {
      id: 'general',
      label: 'General',
      icon: Settings,
      group: 'Preferences',
    },
    {
      id: 'guided_tour',
      label: 'Guided Tour',
      icon: Compass,
      group: 'Walkthrough',
    },
    ...(isITAdmin
      ? [
          {
            id: 'developer_mode',
            label: 'Developer Mode',
            icon: Code2,
            group: 'Admin Tools',
          },
        ]
      : []),
  ];

  const activeThemeItem = COLOR_THEMES.find((t) => t.id === currentTheme) || COLOR_THEMES[0];

  return (
    <>
      {/* Settings Trigger Button in Sidebar Footer */}
      <AppButton
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="text-muted hover:text-foreground hover:bg-neutral shrink-0 h-9 w-9 flex items-center justify-center rounded-lg relative transition mx-auto cursor-pointer"
        title="Settings & Preferences"
        aria-label="Settings"
        leftIcon={
          <div className="relative flex items-center justify-center">
            <Settings size={17} className="text-muted-foreground hover:text-foreground transition-colors" />
            <span
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full ring-1 ring-background shadow-xs"
              style={{ backgroundColor: activeThemeItem.accentBg }}
            />
          </div>
        }
      />

      {/* ProPort Settings Modal Layout */}
      <AppModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        width={960}
        padding="none"
        mask={false}
        centered
        closeIcon={null}
      >
        <AppModalBody className="flex flex-col md:flex-row h-[75vh] md:h-[540px] relative overflow-hidden bg-background rounded-2xl">
          {/* Close Button */}
          <AppButton
            variant="ghost"
            size="icon"
            shape="pill"
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 text-foreground/50 hover:text-foreground hover:bg-foreground/5 z-10"
          >
            <X size={20} />
          </AppButton>

          {/* Left Vertical Tabs Navigation */}
          <AppTabs
            tabs={settingsTabs}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as string)}
            orientation="vertical"
            title="Settings"
          />

          {/* Right Main Settings Content Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            {activeTab === 'general' && (
              <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                {/* Appearance Section Header */}
                <div>
                  <AppLabel as="h3" variant="title">
                    Appearance
                  </AppLabel>
                  <AppLabel as="p" variant="description" className="mt-1">
                    Choose a theme for the portal interface.
                  </AppLabel>
                </div>

                {/* Color Themes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {COLOR_THEMES.map((themeItem) => (
                    <ThemeCard
                      key={themeItem.id}
                      themeItem={themeItem}
                      isSelected={themeItem.id === currentTheme}
                      onSelect={(themeId) => handleSelectTheme(themeId)}
                    />
                  ))}

                  {/* Browse Marketplace Card Tile */}
                  <div
                    onClick={() => alert('Marketplace feature coming soon!')}
                    className="flex flex-col rounded-2xl border-2 transition-all cursor-pointer relative select-none overflow-hidden border-transparent hover:border-border"
                  >
                    <div className="w-full h-24 flex items-center justify-center bg-[#1f1f23] dark:bg-[#1f1f23]">
                      <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
                        <ShoppingBag size={20} className="text-zinc-300" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2.5 w-full justify-between bg-neutral/10 border-t border-border/40 mt-auto">
                      <AppLabel
                        as="span"
                        className="text-xs font-bold leading-none truncate text-foreground/80"
                      >
                        Browse Marketplace
                      </AppLabel>
                    </div>
                  </div>
                </div>

                {/* Text Size Section */}
                <div className="space-y-3 pt-2">
                  <div>
                    <AppLabel
                      as="label"
                      variant="label"
                      className="mb-1 block font-semibold text-foreground/90"
                    >
                      Text Size
                    </AppLabel>
                    <AppLabel as="p" variant="description">
                      Adjust the size of the text in the app to make it easier to read.
                    </AppLabel>
                  </div>

                  <div className="w-full sm:w-105 select-none pt-2 space-y-3">
                    <div className="flex items-center gap-3">
                      <Sliders className="w-4 h-4 text-accent-1" />
                      <input
                        type="range"
                        min="-2"
                        max="4"
                        step="1"
                        value={fontOffset}
                        onChange={(e) => handleOffsetChange(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-neutral rounded-lg appearance-none cursor-pointer accent-accent-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleOffsetChange(0)}
                        disabled={fontOffset === 0}
                        className="p-1 text-muted hover:text-foreground disabled:opacity-30 transition cursor-pointer"
                        title="Reset Text Size"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {SCALE_PRESETS.map((preset) => {
                        const isActive = fontOffset === preset.offset;
                        return (
                          <button
                            key={preset.offset}
                            type="button"
                            onClick={() => handleOffsetChange(preset.offset)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                              isActive
                                ? 'bg-accent-1 text-white font-bold shadow-xs'
                                : 'bg-neutral hover:bg-neutral/80 border border-border text-foreground/70'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'guided_tour' && (
              <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                <div>
                  <AppLabel as="h3" variant="title">
                    Interactive Guided Tour
                  </AppLabel>
                  <AppLabel as="p" variant="description" className="mt-1">
                    Explore DROMMAR features, navigation, and deal workflows.
                  </AppLabel>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-accent-1/10 via-neutral to-background border border-accent-1/20 flex flex-col gap-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent-1/15 text-accent-1 flex items-center justify-center shrink-0 border border-accent-1/30">
                      <Compass className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <span>DROMMAR Platform Walkthrough</span>
                        <span className="px-2 py-0.5 rounded bg-accent-1/15 text-accent-1 text-[10px] font-mono font-bold">
                          9 Steps
                        </span>
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Step-by-step interactive walkthrough guiding you through sidebar navigation, quick search, KPI cards, brands, distribution, and registering new deals.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleStartGuidedTour}
                      className="px-5 py-2.5 rounded-xl bg-accent-1 text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Start Guided Tour</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'developer_mode' && isITAdmin && (
              <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                <div>
                  <AppLabel as="h3" variant="title">
                    Developer Mode
                  </AppLabel>
                  <AppLabel as="p" variant="description" className="mt-1">
                    Toggle browser DevTools and right-click context menu restrictions for IT Administrators.
                  </AppLabel>
                </div>

                <div
                  className={`p-6 rounded-2xl border flex flex-col gap-4 shadow-sm transition-colors ${
                    isDevMode
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-neutral/60 border-border'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                        isDevMode
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                          : 'bg-neutral text-muted-foreground border-border'
                      }`}
                    >
                      {isDevMode ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                    </div>
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span>Developer Mode Status</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              isDevMode
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                : 'bg-neutral text-muted-foreground border border-border'
                            }`}
                          >
                            {isDevMode ? 'ENABLED' : 'DISABLED'}
                          </span>
                        </h4>

                        {/* Switch button */}
                        <button
                          type="button"
                          onClick={handleDevModeToggle}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            isDevMode ? 'bg-emerald-500' : 'bg-zinc-400/50'
                          }`}
                          role="switch"
                          aria-checked={isDevMode}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              isDevMode ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {isDevMode
                          ? 'Right-click context menu, inspect element, and DevTools shortcuts (F12, Ctrl+Shift+I) are unlocked.'
                          : 'Standard security protections active. Right-click context menu and DevTools keyboard shortcuts are blocked for non-admin view.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </AppModalBody>
      </AppModal>
    </>
  );
}

