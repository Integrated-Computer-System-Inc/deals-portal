'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AppBreadcrumbs, BreadcrumbItem } from './ui/breadcrumbs';
import { LayoutDashboard, FileSpreadsheet, PlusCircle, Edit3, FileText, BarChart2 } from 'lucide-react';

export default function Breadcrumbs() {
  const pathname = usePathname();

  if (!pathname || pathname === '/login') {
    return null;
  }

  // Parse path segments
  const segments = pathname.split('/').filter(Boolean);

  const isDashboard = segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard');

  const items: BreadcrumbItem[] = [
    {
      label: 'Home',
      href: isDashboard ? undefined : '/dashboard',
      active: isDashboard,
    },
  ];

  if (!isDashboard && segments[0] === 'reports') {
    items.push({
      label: 'Reports & Analytics',
      icon: <BarChart2 className="w-3.5 h-3.5" />,
      active: true,
    });
  } else if (!isDashboard && segments[0] === 'deals') {
    if (segments.length === 1) {
      items.push({
        label: 'Deals Registry',
        icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
        active: true,
      });
    } else if (segments[1] === 'new') {
      items.push({
        label: 'Deals Registry',
        href: '/deals',
        icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
      });
      items.push({
        label: 'Register New Deal',
        icon: <PlusCircle className="w-3.5 h-3.5" />,
        active: true,
      });
    } else if (segments.length === 2 && segments[1] !== 'new') {
      const dealId = segments[1];
      items.push({
        label: 'Deals Registry',
        href: '/deals',
        icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
        onClick: () => {
          try {
            sessionStorage.setItem('DEALS_NAVIGATED_TO_DETAIL', 'true');
          } catch {}
        },
      });
      items.push({
        label: `Deal #${dealId}`,
        icon: <FileText className="w-3.5 h-3.5" />,
        active: true,
      });
    } else if (segments[2] === 'edit') {
      const dealId = segments[1];
      items.push({
        label: 'Deals Registry',
        href: '/deals',
        icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
        onClick: () => {
          try {
            sessionStorage.setItem('DEALS_NAVIGATED_TO_DETAIL', 'true');
          } catch {}
        },
      });
      items.push({
        label: `Deal #${dealId}`,
        href: `/deals/${dealId}`,
        icon: <FileText className="w-3.5 h-3.5" />,
      });
      items.push({
        label: 'Edit Deal',
        icon: <Edit3 className="w-3.5 h-3.5" />,
        active: true,
      });
    } else {
      items.push({
        label: 'Deals Registry',
        href: '/deals',
        icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
      });
      items.push({
        label: `Deal Details`,
        active: true,
      });
    }
  } else if (!isDashboard) {
    // Generic fallback for any other routes
    segments.forEach((seg, idx) => {
      const isLast = idx === segments.length - 1;
      const formatted = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
      const href = `/${segments.slice(0, idx + 1).join('/')}`;

      items.push({
        label: formatted,
        href: isLast ? undefined : href,
        active: isLast,
      });
    });
  }

  return (
    <div className="flex items-center justify-between pb-2 border-b border-border/40">
      <AppBreadcrumbs items={items} />
    </div>
  );
}
