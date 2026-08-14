'use client';

import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { getDashboardSummary, DashboardSummaryData } from '../app/actions/deals';

export const DASHBOARD_METRICS_CACHE_KEY = 'dashboard-summary-metrics';

export function useDashboardMetrics() {
  const { data: session } = useSession();

  const role = (session?.user as any)?.role || 'admin';
  const accountName = (session?.user as any)?.AccountName || '';
  const accountGroup = (session?.user as any)?.AccountGroup || '';

  const cacheKey = session
    ? `${DASHBOARD_METRICS_CACHE_KEY}:${role}:${accountName}:${accountGroup}`
    : null;

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<DashboardSummaryData>(
    cacheKey,
    async () => {
      const res = await getDashboardSummary();
      if (res && res.success && res.data) {
        return res.data;
      }
      throw new Error(res?.error || 'Failed to load dashboard metrics');
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
      keepPreviousData: true,
    }
  );

  return {
    metrics: data,
    loading: isLoading && !data,
    validating: isValidating,
    error: error ? (error.message || 'Error loading dashboard metrics') : null,
    refresh: () => mutate(),
  };
}
