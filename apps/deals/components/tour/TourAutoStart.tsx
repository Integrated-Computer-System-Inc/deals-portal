'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTour } from './TourProvider';
import { getUserTourStatus } from '@/app/actions/tour';

export default function TourAutoStart() {
  const pathname = usePathname();
  const { status } = useSession();
  const { startTour } = useTour();
  const hasCheckedRef = React.useRef(false);

  React.useEffect(() => {
    // Only check when user is authenticated and on the dashboard or root
    if (status !== 'authenticated') return;
    if (pathname !== '/dashboard' && pathname !== '/') return;
    if (hasCheckedRef.current) return;

    hasCheckedRef.current = true;

    async function checkStatus() {
      try {
        // Fast local check first
        const localFlag = localStorage.getItem('dealreg_tour_completed');
        if (localFlag === 'true') {
          return;
        }

        // Check database Users table
        const { hasCompletedTour } = await getUserTourStatus();
        if (hasCompletedTour) {
          try {
            localStorage.setItem('dealreg_tour_completed', 'true');
          } catch {}
          return;
        }

        // If user has not completed tour in DB, auto-trigger smoothly after DOM settles
        const timer = setTimeout(() => {
          startTour('dashboard-tour');
        }, 1000);

        return () => clearTimeout(timer);
      } catch (e) {
        console.warn('[TourAutoStart] Error checking tour status:', e);
      }
    }

    checkStatus();
  }, [pathname, status, startTour]);

  return null;
}
