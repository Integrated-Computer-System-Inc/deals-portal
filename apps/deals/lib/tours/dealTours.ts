export interface TourStep {
  icon?: string;
  title: string;
  content: string;
  selector: string;
  side?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  pointerPadding?: number;
  pointerRadius?: number;
}

export interface Tour {
  tour: string;
  steps: TourStep[];
}

/**
 * Roles that have access to the complete 9-step walkthrough:
 * - IT Administrator (ITadmin)
 * - Sales Administrator (admin)
 * - Admin Assistant (aa)
 *
 * All other roles (Supervisor / BU Head, Account Officer (AO), Product Manager (PM))
 * have the customized 8-step guide with 'Register New Deal' step removed.
 */
export function isFullTourRole(role?: string | null): boolean {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  return r === 'itadmin' || r === 'admin' || r === 'aa';
}

/**
 * Returns role-tailored walkthrough steps for the given tour
 */
export function getDealTour(tourName: string = 'dashboard-tour', role?: string | null): Tour {
  const isFull = isFullTourRole(role);

  if (tourName === 'dashboard-tour') {
    const steps: TourStep[] = [
      {
        icon: '👋',
        title: 'Welcome to DROMMAR',
        content:
          'Integrated Computer Systems enterprise deal registration, SLA tracking, and partner pipeline monitoring.',
        selector: '#tour-brand-header',
        side: 'right',
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: '🧭',
        title: 'Main Navigation Menu',
        content: isFull
          ? 'Access all core sections: Home Dashboard, Deals Registry with status filters, Reports analytics, and Register Deal.'
          : 'Access your assigned sections: Home Dashboard, Deals Registry with status filters, and Reports analytics.',
        selector: '#tour-sidebar-nav',
        side: 'right',
        pointerPadding: 2,
        pointerRadius: 12,
      },
      {
        icon: '📅',
        title: 'Date & Period Filter',
        content:
          'Filter all dashboard metrics, active deal counters, and distribution charts by preset or custom date ranges.',
        selector: '#tour-date-filter',
        side: 'bottom',
        pointerPadding: 4,
        pointerRadius: 12,
      },
      ...(isFull
        ? [
            {
              icon: '➕',
              title: 'Register New Deal',
              content:
                'Initiate a new deal registration anytime. The wizard helps you submit customer and project details with ease.',
              selector: '#tour-register-deal-btn',
              side: 'bottom' as const,
              pointerPadding: 4,
              pointerRadius: 12,
            },
          ]
        : []),
      {
        icon: '🚀',
        title: 'View Deals Registry',
        content:
          'Quickly navigate to the full interactive deals database with multi-field search and status filters.',
        selector: '#tour-nav-deals-btn',
        side: 'bottom',
        pointerPadding: 4,
        pointerRadius: 12,
      },
      {
        icon: '📊',
        title: 'Core KPI Metrics Overview',
        content:
          'Click any tile to open a deep-dive dialog: Total Registered Deals, Expired Deals (WTN), Renewed Pipeline, Active Brands, Expiring Deals (≤30d), and Lost Deal Review Studio.',
        selector: '#tour-dashboard-metrics',
        side: 'bottom',
        pointerPadding: 8,
        pointerRadius: 18,
      },
      {
        icon: '🏷️',
        title: 'Deals Distribution by Brand',
        content:
          'Analyze brand share, total registered pipeline values, and sort by highest value or deal count.',
        selector: '#tour-distribution-brand',
        side: 'top',
        pointerPadding: 6,
        pointerRadius: 16,
      },
      {
        icon: '🏢',
        title: 'Deals Distribution by Business Unit (BU)',
        content:
          'Track quota distribution, active pipeline, and approval progress across ICS official Business Units.',
        selector: '#tour-distribution-bu',
        side: 'top',
        pointerPadding: 6,
        pointerRadius: 16,
      },
      {
        icon: '⚡',
        title: 'Recent Deals Activity Stream',
        content:
          'Real-time table view of the latest registered deals with assigned Account Officers and quick details links.',
        selector: '#tour-recent-deals',
        side: 'top',
        pointerPadding: 6,
        pointerRadius: 16,
      },
    ];

    return {
      tour: 'dashboard-tour',
      steps,
    };
  }

  const found = dealTours.find((t) => t.tour === tourName) || dealTours[0];
  return found;
}

export const dealTours: Tour[] = [
  getDealTour('dashboard-tour', 'ITadmin'),
];
