'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { dealTours, getDealTour, type Tour, type TourStep } from '@/lib/tours/dealTours';
import { TourCard } from './TourCard';
import TourCompletionModal from './TourCompletionModal';
import { markTourCompleted } from '@/app/actions/tour';

interface TourContextValue {
  isOpen: boolean;
  currentStep: number;
  totalSteps: number;
  startTour: (tourName?: string, roleOverride?: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  closeTour: () => void;
  finishTour: () => void;
  openCompletionModal: () => void;
  closeCompletionModal: () => void;
}

const TourContext = createContext<TourContextValue>({
  isOpen: false,
  currentStep: 0,
  totalSteps: 0,
  startTour: () => {},
  nextStep: () => {},
  prevStep: () => {},
  closeTour: () => {},
  finishTour: () => {},
  openCompletionModal: () => {},
  closeCompletionModal: () => {},
});

export const useTour = () => useContext(TourContext);
export const useTourModal = () => useContext(TourContext);

interface TourProviderProps {
  children: React.ReactNode;
}

export default function TourProvider({ children }: TourProviderProps) {
  const { data: session } = useSession();
  const currentRole = (session?.user as any)?.role;

  const [activeTour, setActiveTour] = useState<Tour | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isFinishingTransition, setIsFinishingTransition] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const steps = activeTour?.steps || [];
  const currentStepData: TourStep | undefined = steps[stepIndex];

  // Update target rect with high precision
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !currentStepData) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(currentStepData.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);

      // If the element is out of the primary viewable zone inside <main>, scroll main smoothly
      if (typeof window !== 'undefined' && (rect.top < 60 || rect.bottom > window.innerHeight - 60)) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          const updated = el.getBoundingClientRect();
          setTargetRect(updated);
        }, 120);
        setTimeout(() => {
          const updated = el.getBoundingClientRect();
          setTargetRect(updated);
        }, 320);
        setTimeout(() => {
          const updated = el.getBoundingClientRect();
          setTargetRect(updated);
        }, 500);
      }
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStepData]);

  // Recalculate on step change or resize/scroll
  useEffect(() => {
    updateTargetRect();
    const handleRecalc = () => {
      if (!isOpen || !currentStepData) return;
      const el = document.querySelector(currentStepData.selector);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
    };

    window.addEventListener('resize', handleRecalc, { passive: true });
    window.addEventListener('scroll', handleRecalc, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', handleRecalc);
      window.removeEventListener('scroll', handleRecalc, { capture: true });
    };
  }, [updateTargetRect, stepIndex, isOpen, currentStepData]);

  const startTour = useCallback((tourName: string = 'dashboard-tour', roleOverride?: string) => {
    const roleToUse = roleOverride || currentRole;
    const found = getDealTour(tourName, roleToUse);
    if (found && found.steps.length > 0) {
      setActiveTour(found);
      setStepIndex(0);
      setIsOpen(true);
    }
  }, [currentRole]);

  const closeTour = useCallback(() => {
    setIsOpen(false);
    try {
      localStorage.setItem('dealreg_tour_completed', 'true');
    } catch {}
    markTourCompleted().catch(() => {});
  }, []);

  const finishTour = useCallback(() => {
    setIsOpen(false);
    setIsFinishingTransition(true);
    try {
      localStorage.setItem('dealreg_tour_completed', 'true');
    } catch {}
    markTourCompleted().catch(() => {});

    // Smooth white particle bloom transition into the Welcome to DROMMAR celebration modal
    setTimeout(() => {
      setIsFinishingTransition(false);
      setCompletionModalOpen(true);
    }, 450);
  }, []);

  const nextStep = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      finishTour();
    }
  }, [stepIndex, steps.length, finishTour]);

  const prevStep = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    }
  }, [stepIndex]);

  // Compute smart viewport-clamped card position (SSR safe)
  const getCardPosition = () => {
    if (typeof window === 'undefined') {
      return { top: 100, left: 100 };
    }

    const cardWidth = 360;
    const cardHeight = 220;
    const margin = 16;
    const gap = 14;
    const winWidth = window.innerWidth || 1024;
    const winHeight = window.innerHeight || 768;

    if (!targetRect) {
      return {
        top: Math.max(margin, winHeight / 2 - cardHeight / 2),
        left: Math.max(margin, winWidth / 2 - cardWidth / 2),
      };
    }

    const preferredSide = currentStepData?.side || 'bottom';
    let idealTop = targetRect.bottom + gap;
    let idealLeft = targetRect.left + targetRect.width / 2 - cardWidth / 2;

    if (preferredSide === 'right') {
      idealLeft = targetRect.right + gap;
      idealTop = targetRect.top + targetRect.height / 2 - cardHeight / 2;
    } else if (preferredSide === 'left') {
      idealLeft = targetRect.left - cardWidth - gap;
      idealTop = targetRect.top + targetRect.height / 2 - cardHeight / 2;
    } else if (preferredSide === 'top') {
      idealTop = targetRect.top - cardHeight - gap;
      idealLeft = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    } else if (preferredSide === 'bottom') {
      idealTop = targetRect.bottom + gap;
      idealLeft = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    }

    // Flip if overflowing preferred direction
    if (preferredSide === 'bottom' && idealTop + cardHeight > winHeight - margin) {
      if (targetRect.top - cardHeight - gap >= margin) {
        idealTop = targetRect.top - cardHeight - gap;
      }
    } else if (preferredSide === 'right' && idealLeft + cardWidth > winWidth - margin) {
      if (targetRect.left - cardWidth - gap >= margin) {
        idealLeft = targetRect.left - cardWidth - gap;
      } else {
        idealLeft = targetRect.left;
        idealTop = targetRect.bottom + gap;
      }
    }

    // STRICT CLAMPING: Card NEVER goes off screen
    const clampedLeft = Math.max(margin, Math.min(winWidth - cardWidth - margin, idealLeft));
    const clampedTop = Math.max(margin, Math.min(winHeight - cardHeight - margin, idealTop));

    return { top: clampedTop, left: clampedLeft };
  };

  const cardPos = mounted && isOpen ? getCardPosition() : { top: 0, left: 0 };
  const pad = currentStepData?.pointerPadding ?? 6;
  const radius = currentStepData?.pointerRadius ?? 14;

  const spotlightBox = targetRect
    ? {
        x: Math.max(0, targetRect.left - pad),
        y: Math.max(0, targetRect.top - pad),
        width: targetRect.width + pad * 2,
        height: targetRect.height + pad * 2,
      }
    : null;

  return (
    <TourContext.Provider
      value={{
        isOpen,
        currentStep: stepIndex,
        totalSteps: steps.length,
        startTour,
        nextStep,
        prevStep,
        closeTour,
        finishTour,
        openCompletionModal: () => setCompletionModalOpen(true),
        closeCompletionModal: () => setCompletionModalOpen(false),
      }}
    >
      {children}

      {/* Tour Overlay & Spotlight rendered into Portal */}
      {mounted &&
        isOpen &&
        currentStepData &&
        createPortal(
          <div className="fixed inset-0 z-[99990] pointer-events-auto select-none">
            {/* SVG Mask Cutout Backdrop */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <mask id="tour-spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {spotlightBox && (
                    <rect
                      x={spotlightBox.x}
                      y={spotlightBox.y}
                      width={spotlightBox.width}
                      height={spotlightBox.height}
                      rx={radius}
                      ry={radius}
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.75)"
                mask="url(#tour-spotlight-mask)"
                className="transition-colors duration-200"
              />
            </svg>

            {/* Glowing Border Box around the target element */}
            {spotlightBox && (
              <div
                className="absolute pointer-events-none transition-all duration-200 ease-out"
                style={{
                  top: spotlightBox.y,
                  left: spotlightBox.x,
                  width: spotlightBox.width,
                  height: spotlightBox.height,
                  borderRadius: radius,
                  border: '2.5px solid var(--accent-1)',
                  boxShadow: '0 0 0 4px var(--hover-bg), 0 0 25px var(--accent-1)',
                }}
              />
            )}

            {/* Positioned Clamped Tour Card */}
            <div
              ref={cardRef}
              className="absolute transition-all duration-200 ease-out z-[99995]"
              style={{
                top: cardPos.top,
                left: cardPos.left,
              }}
            >
              <TourCard
                step={currentStepData}
                currentStep={stepIndex}
                totalSteps={steps.length}
                onNext={nextStep}
                onPrev={prevStep}
                onSkip={closeTour}
                onFinish={finishTour}
                onClose={closeTour}
              />
            </div>
          </div>,
          document.body
        )}

      {/* Smooth White Dot Transition Bloom */}
      {mounted &&
        isFinishingTransition &&
        createPortal(
          <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-none animate-in fade-in duration-300">
            {/* Glowing White/Cyan Particle Bloom */}
            <div className="relative flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-white shadow-[0_0_25px_8px_#ffffff,0_0_60px_20px_#38bdf8] animate-ping duration-700" />
              <div className="absolute w-16 h-16 rounded-full bg-cyan-400/40 blur-xl animate-pulse" />
            </div>
          </div>,
          document.body
        )}

      <TourCompletionModal
        open={completionModalOpen}
        onClose={() => setCompletionModalOpen(false)}
      />
    </TourContext.Provider>
  );
}
