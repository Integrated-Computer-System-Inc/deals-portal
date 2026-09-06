'use client';

import { useDashboardQuery } from './useDealsQuery';
import { DashboardSummaryData } from '../app/actions/deals';

export { useDashboardQuery };
export type { DashboardSummaryData };

export function useDashboardMetrics(dateRange?: { preset?: string; startDate?: string; endDate?: string }) {
  const { data, error, isLoading, isFetching, refetch } = useDashboardQuery(dateRange);

  return {
    metrics: data,
    loading: isLoading && !data,
    validating: isFetching,
    error: error ? (error instanceof Error ? error.message : 'Error loading dashboard metrics') : null,
    refresh: () => refetch(),
  };
}

