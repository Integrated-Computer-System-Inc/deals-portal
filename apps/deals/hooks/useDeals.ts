'use client';

import { useSession } from 'next-auth/react';
import { useDealsQuery } from './useDealsQuery';
import { DealHeaderRecord, UserRole } from '@my-app/types';

export interface UseDealsOptions {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  statusFilter?: string;
  buFilter?: string;
  brandFilter?: string;
}

export function useDeals(options: UseDealsOptions = {}) {
  const { data: session } = useSession();

  const role: UserRole = (session?.user as any)?.role || 'admin';
  const accountName = (session?.user as any)?.AccountName || (session?.user as any)?.name || 'Demo User';
  const accountGroup = (session?.user as any)?.AccountGroup || 'HQ';

  const {
    page = 1,
    pageSize = 25,
    searchQuery = '',
    statusFilter = 'ALL',
    buFilter = 'ALL',
    brandFilter = 'ALL',
  } = options;

  const filter = session
    ? {
        userRole: role,
        accountName,
        accountGroup,
        page,
        pageSize,
        searchQuery,
        statusFilter,
        buFilter,
        brandFilter,
      }
    : undefined;

  const { data: deals = [], isLoading, isFetching, error, refetch } = useDealsQuery(filter, {
    enabled: !!session,
  });

  return {
    deals: deals || [],
    totalCount: deals.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(deals.length / pageSize)),
    loading: isLoading && (!deals || deals.length === 0),
    validating: isFetching,
    error: error ? (error instanceof Error ? error.message : 'Error loading deals') : null,
    mutate: () => refetch(),
    refresh: () => refetch(),
  };
}

