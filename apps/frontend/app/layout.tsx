import './globals.css';
import React from 'react';
import NextAuthProvider from '../components/NextAuthProvider';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'Deals Registration Portal',
  description: 'Enterprise Deal Registration and Approval Tracking System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased font-sans bg-slate-50 text-slate-900 min-h-screen flex flex-col">
        <NextAuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        </NextAuthProvider>
      </body>
    </html>
  );
}
