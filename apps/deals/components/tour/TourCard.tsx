'use client';

import React from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { TourStep } from '@/lib/tours/dealTours';
import { AppLabel } from '../ui/labels';

interface TourCardProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
  onClose: () => void;
}

export const TourCard: React.FC<TourCardProps> = ({
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onFinish,
  onClose,
}) => {
  const isFirst = currentStep === 0;
  const isLast = currentStep + 1 === totalSteps;

  return (
    <div className="w-[360px] max-w-[calc(100vw-32px)] rounded-2xl border border-border/80 bg-card-bg p-5 shadow-2xl backdrop-blur-2xl text-foreground select-none pointer-events-auto transition-all duration-200">
      {/* Header with Step Counter & Close button */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          {step.icon && (
            <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-accent-1/10 text-accent-1 text-sm font-bold shadow-xs shrink-0 border border-accent-1/20">
              {step.icon}
            </span>
          )}
          <span className="text-xs font-bold tracking-wider uppercase text-foreground/50">
            Step {currentStep + 1} of {totalSteps}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-foreground/50 hover:text-foreground hover:bg-neutral transition-colors cursor-pointer"
          aria-label="Close tour"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body: Title & Content */}
      <div className="pt-3.5 pb-4 space-y-1.5">
        <AppLabel as="h4" variant="title" className="text-base font-bold leading-snug">
          {step.title}
        </AppLabel>
        <AppLabel as="p" variant="description" className="text-xs leading-relaxed text-foreground/70">
          {step.content}
        </AppLabel>
      </div>

      {/* Progress Dots */}
      <div className="flex items-center gap-1.5 pb-4">
        {Array.from({ length: totalSteps }).map((_, idx) => (
          <span
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentStep
                ? 'w-6 bg-accent-1'
                : idx < currentStep
                ? 'w-2 bg-accent-1/40'
                : 'w-2 bg-border/60'
            }`}
          />
        ))}
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
        <button
          type="button"
          onClick={onSkip}
          className="text-xs font-semibold text-foreground/50 hover:text-foreground transition-colors px-2.5 py-1.5 rounded-xl hover:bg-neutral cursor-pointer"
        >
          Skip tour
        </button>

        <div className="flex items-center gap-2">
          {!isFirst && (
            <button
              type="button"
              onClick={onPrev}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-neutral/40 hover:bg-neutral text-foreground transition-colors shadow-xs cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-foreground/60" />
              Back
            </button>
          )}

          {!isLast ? (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-accent-1 text-white hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onFinish}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

