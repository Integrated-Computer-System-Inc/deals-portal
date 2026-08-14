'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useSession } from 'next-auth/react';
import { getScopedDeals } from '../app/actions/deals';
import { DealHeaderRecord, UserRole } from '@my-app/types';

export const DEALS_CACHE_KEY_PREFIX = 'scoped-deals';

export interface UseDealsOptions {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  statusFilter?: string;
  buFilter?: string;
  brandFilter?: string;
}

export function getDealsCacheKey(
  role: string,
  accountName: string,
  accountGroup: string,
  options: UseDealsOptions = {}
) {
  const {
    page = 1,
    pageSize = 25,
    searchQuery = '',
    statusFilter = 'ALL',
    buFilter = 'ALL',
    brandFilter = 'ALL',
  } = options;

  return `${DEALS_CACHE_KEY_PREFIX}:${role}:${accountName}:${accountGroup}:${page}:${pageSize}:${searchQuery}:${statusFilter}:${buFilter}:${brandFilter}`;
}

/**
 * Global helper to invalidate/revalidate deals cache across the entire application.
 * Can be called after create, update, delete, or status changes.
 */
export async function invalidateDealsCache() {
  return globalMutate(
    (key) => typeof key === 'string' && key.startsWith(DEALS_CACHE_KEY_PREFIX),
    undefined,
    { revalidate: true }
  );
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

  const cacheKey = session
    ? getDealsCacheKey(role, accountName, accountGroup, {
        page,
        pageSize,
        searchQuery,
        statusFilter,
        buFilter,
        brandFilter,
      })
    : null;

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(
    cacheKey,
    async () => {
      const res = await getScopedDeals({
        userRole: role,
        accountName,
        accountGroup,
        page,
        pageSize,
        searchQuery,
        statusFilter,
        buFilter,
        brandFilter,
      });

      if (res && res.success && Array.isArray(res.data)) {
        return {
          deals: res.data,
          totalCount: res.totalCount ?? res.data.length,
          page: res.page ?? page,
          pageSize: res.pageSize ?? pageSize,
          totalPages: res.totalPages ?? Math.max(1, Math.ceil((res.totalCount ?? res.data.length) / pageSize)),
        };
      }
      throw new Error(res?.error || 'Failed to fetch deals');
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 15000,
      keepPreviousData: true,
    }
  );

  return {
    deals: data?.deals || [],
    totalCount: data?.totalCount ?? 0,
    page: data?.page ?? page,
    pageSize: data?.pageSize ?? pageSize,
    totalPages: data?.totalPages ?? 1,
    loading: isLoading && !data,
    validating: isValidating,
    error: error ? (error.message || 'Error loading deals') : null,
    mutate,
    refresh: () => mutate(),
  };
}
