import './globals.css';
import React from 'react';
import NextAuthProvider from '../components/NextAuthProvider';
import AppShell from '../components/AppShell';

export const metadata = {
  title: 'ICS Deal Registration',
  description: 'Enterprise Deal Registration, Tracking and SLA Management',
};

// Inline script to apply saved theme before React hydration (prevents flash)
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('dealreg-color-theme');
    var d = localStorage.getItem('dealreg-dark-mode');
    if (t) document.documentElement.setAttribute('data-color-theme', t);
    if (d === 'true') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
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
      <body className="antialiased font-sans min-h-screen bg-background text-foreground">
        <NextAuthProvider>
          <AppShell>{children}</AppShell>
        </NextAuthProvider>
      </body>
    </html>
  );
}
