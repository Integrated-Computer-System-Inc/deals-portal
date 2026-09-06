'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getReportsMetrics,
  getReportDrilldownDeals,
  ReportsSummaryMetrics,
  DateRangeFilterParams,
} from '../app/actions/reports';
import { ScopedDealsFilter } from '@my-app/types';

export const REPORT_QUERY_KEYS = {
  all: ['reports'] as const,
  metrics: (filter?: ScopedDealsFilter, dateRange?: DateRangeFilterParams) =>
    [...REPORT_QUERY_KEYS.all, 'metrics', filter, dateRange] as const,
  drilldown: (params: any) => [...REPORT_QUERY_KEYS.all, 'drilldown', params] as const,
};

export function useReportsMetricsQuery(
  filter?: ScopedDealsFilter,
  dateRange?: DateRangeFilterParams,
  options?: { enabled?: boolean }
) {
  return useQuery<ReportsSummaryMetrics>({
    queryKey: REPORT_QUERY_KEYS.metrics(filter, dateRange),
    queryFn: async () => {
      const res = await getReportsMetrics(filter || {}, dateRange);
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.error || 'Failed to fetch reporting metrics');
    },
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: 1000 * 60 * 5, // 5 minutes fresh window
    gcTime: 1000 * 60 * 30, // 30 minutes in memory
    refetchOnWindowFocus: false,
  });
}

export function useReportDrilldownQuery(params: {
  type: 'registered' | 'expired' | 'expiredThisMonth' | 'renewed' | 'lost' | 'expiring' | 'brand' | 'bu' | 'all';
  value?: string;
  urgency?: 'ALL' | 'CRITICAL' | 'URGENT' | 'WARNING' | 'NOTICE';
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  preset?: string;
  startDate?: string;
  endDate?: string;
  filter?: ScopedDealsFilter;
  enabled?: boolean;
}) {
  const { enabled, ...queryParams } = params;

  return useQuery({
    queryKey: REPORT_QUERY_KEYS.drilldown(queryParams),
    queryFn: async () => {
      const res = await getReportDrilldownDeals(queryParams);
      if (res.success && res.data) {
        return res;
      }
      throw new Error(res.error || 'Failed to fetch drilldown deals');
    },
    enabled: enabled !== undefined ? enabled : true,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

