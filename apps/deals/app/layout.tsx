import './globals.css';
import React from 'react';
import NextAuthProvider from '../components/NextAuthProvider';
import QueryProvider from '../components/QueryProvider';
import AppShell from '../components/AppShell';
import { SecurityGuard } from '../components/SecurityGuard';

export const metadata = {
  title: 'ICS Deal Registration',
  description: 'Enterprise Deal Registration, Tracking and SLA Management',
};

// Inline script to apply saved theme before React hydration (prevents flash)
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('dealreg-color-theme') || 'dark-default';
    var d = localStorage.getItem('dealreg-dark-mode');
    var isDark = d === null ? true : (d !== 'false');
    var scale = localStorage.getItem('dealreg-font-scale');
    
    if (t && t !== 'dark-default' && t !== 'default') {
      document.documentElement.setAttribute('data-color-theme', t);
    } else {
      document.documentElement.removeAttribute('data-color-theme');
    }
    
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme');
    }

    if (scale) {
      document.documentElement.style.fontSize = scale + '%';
    }
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased font-sans min-h-screen bg-background text-foreground select-none">
        <NextAuthProvider>
          <QueryProvider>
            <SecurityGuard />
            <AppShell>{children}</AppShell>
          </QueryProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
