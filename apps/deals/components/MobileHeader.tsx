'use client';

import React from 'react';
import { Menu, Sparkles } from 'lucide-react';
import { useSidebar, AppAvatar, AppButton } from './ui';
import { useSession } from 'next-auth/react';
import ThemeSwitcher from './ThemeSwitcher';
import Link from 'next/link';

export default function MobileHeader() {
  const { toggleMobileOpen } = useSidebar();
  const { data: session } = useSession();

  const userRole = (session?.user as any)?.role;
  const accountName = (session?.user as any)?.AccountName || session?.user?.name || 'User';
  const accountImage = (session?.user as any)?.GAvatar || session?.user?.image || undefined;

  return (
    <header className="lg:hidden sticky top-0 z-30 w-full h-14 px-4 bg-sidebar/95 backdrop-blur-md border-b border-border flex items-center justify-between shadow-xs">
      {/* Left: Mobile Drawer Trigger + Brand */}
      <div className="flex items-center gap-3">
        <AppButton
          variant="ghost"
          size="icon"
          onClick={toggleMobileOpen}
          className="h-9 w-9 text-muted hover:text-foreground hover:bg-neutral rounded-lg"
          title="Open Menu"
          aria-label="Open Menu"
          leftIcon={<Menu size={20} />}
        />

        <Link href="/dashboard" className="flex items-center gap-2 no-underline">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-700 flex items-center justify-center text-white font-black text-xs shadow-xs tracking-wider shrink-0 select-none">
            ICS
          </div>
          <span className="font-bold text-sm text-foreground tracking-tight">
            DROMMAR
          </span>
        </Link>
      </div>

      {/* Right: Theme Switcher & User Avatar */}
      <div className="flex items-center gap-2">
        <ThemeSwitcher />
        <AppAvatar
          name={accountName}
          src={accountImage}
          size={30}
          className="shrink-0"
        />
      </div>
    </header>
  );
}

