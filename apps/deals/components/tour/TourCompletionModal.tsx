'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight } from 'lucide-react';

interface TourCompletionModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TourCompletionModal({ open, onClose }: TourCompletionModalProps) {
  const router = useRouter();

  if (!open) return null;

  const handleGoToDashboard = () => {
    onClose();
    router.push('/dashboard');
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg rounded-3xl border border-border/80 bg-background/95 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl text-center space-y-5 animate-in zoom-in-95 duration-300 select-none">
        {/* Subtle glowing primary aura */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

        {/* Mascot Image - Gary holding Success Message */}
        <div className="relative flex justify-center items-center">
          <div className="relative p-2 rounded-2xl bg-gradient-to-b from-primary/10 to-transparent">
            <img
              src="/api/icons/Success_Message.png"
              alt="Welcome to DROMMAR"
              className="max-h-48 sm:max-h-60 w-auto object-contain drop-shadow-2xl mx-auto select-none transition-transform hover:scale-105 duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/icons/Success_Message.png';
              }}
            />
          </div>
        </div>

        {/* Header Titles */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold uppercase tracking-wider border border-primary/25">
            <Sparkles className="w-3.5 h-3.5" />
            Walkthrough Completed
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Welcome to DROMMAR!
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
            <span className="font-bold text-foreground">D</span>eal{' '}
            <span className="font-bold text-foreground">R</span>egistration,{' '}
            <span className="font-bold text-foreground">O</span>perations,{' '}
            <span className="font-bold text-foreground">M</span>anagement &{' '}
            <span className="font-bold text-foreground">M</span>onitoring{' '}
            <span className="font-bold text-foreground">A</span>utomation{' '}
            <span className="font-bold text-foreground">R</span>esource
          </p>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
          You are now ready to track partner SLAs, manage active registrations, and explore pipeline intelligence.
        </p>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGoToDashboard}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 mx-auto cursor-pointer"
          >
            <span>Explore DROMMAR</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
