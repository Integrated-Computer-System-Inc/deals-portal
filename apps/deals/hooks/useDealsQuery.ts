'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getScopedDeals,
  getDealById,
  createDeal,
  updateDeal,
  saveLostDeal,
  updateWTN,
  saveDealRenewal,
} from '../app/actions/deals';
import {
  DealHeaderRecord,
  ScopedDealsFilter,
  CreateDealPayload,
  UpdateDealPayload,
  SaveLostDealPayload,
  SaveDealRenewalPayload,
  DealRenewalRecord,
  UpdateWTNPayload,
  UserRole,
} from '@my-app/types';

/**
 * Normalizes filter parameters to prevent cache key fragmentations across pages
 */
export function normalizeScopedFilter(filter?: ScopedDealsFilter): ScopedDealsFilter {
  if (!filter) return { userRole: 'admin' };
  return {
    userRole: filter.userRole || 'admin',
    accountName: filter.accountName || undefined,
    accountGroup: filter.accountGroup || undefined,
    searchQuery: filter.searchQuery ? filter.searchQuery.trim() : undefined,
    statusFilter: filter.statusFilter && filter.statusFilter !== 'ALL' ? filter.statusFilter : undefined,
    buFilter: filter.buFilter && filter.buFilter !== 'ALL' ? filter.buFilter : undefined,
    brandFilter: filter.brandFilter && filter.brandFilter !== 'ALL' ? filter.brandFilter : undefined,
    page: filter.page && filter.page > 1 ? filter.page : undefined,
    pageSize: filter.pageSize !== undefined && filter.pageSize > 0 ? filter.pageSize : undefined,
  };
}

export const DEAL_QUERY_KEYS = {
  all: ['deals'] as const,
  lists: () => [...DEAL_QUERY_KEYS.all, 'list'] as const,
  list: (filter?: ScopedDealsFilter) => [...DEAL_QUERY_KEYS.lists(), normalizeScopedFilter(filter)] as const,
  details: () => [...DEAL_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number | null) => [...DEAL_QUERY_KEYS.details(), id ? Number(id) : null] as const,
};

/**
 * Shared hook to get consistent current user filter for Dashboard, Deals, and Reports
 */
export function useCurrentUserFilter(): ScopedDealsFilter {
  const { data: session } = useSession();
  const role: UserRole = (session?.user as any)?.role || 'admin';
  const accountName = (session?.user as any)?.AccountName || (session?.user as any)?.name;
  const accountGroup = (session?.user as any)?.AccountGroup;

  return useMemo(
    () => ({
      userRole: role,
      accountName: accountName || undefined,
      accountGroup: accountGroup || undefined,
    }),
    [role, accountName, accountGroup]
  );
}

/**
 * Hook to retrieve filtered/scoped active deals with TanStack Query caching
 */
export function useDealsQuery(filter?: ScopedDealsFilter, options?: { enabled?: boolean }) {
  const normalizedKey = DEAL_QUERY_KEYS.list(filter);

  return useQuery<DealHeaderRecord[]>({
    queryKey: normalizedKey,
    queryFn: async () => {
      const res = await getScopedDeals(filter || {});
      if (res && res.success && Array.isArray(res.data)) {
        return res.data;
      }
      throw new Error(res?.error || 'Failed to fetch deals');
    },
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: 1000 * 60 * 5, // 5 minutes fresh window
    gcTime: 1000 * 60 * 30, // 30 minutes in-memory retention
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Helper to optimistically update deals in all cached lists
 */
function updateDealsInAllCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (deal: DealHeaderRecord) => DealHeaderRecord
) {
  const queries = queryClient.getQueriesData<DealHeaderRecord[]>({ queryKey: DEAL_QUERY_KEYS.all });
  for (const [key, data] of queries) {
    if (Array.isArray(data)) {
      queryClient.setQueryData(key, data.map(updater));
    }
  }
}

/**
 * Hook to retrieve a single deal record by ID, seeded immediately from the cached deals list
 */
export function useDealQuery(dealID: number | null, enabled = true) {
  const queryClient = useQueryClient();

  return useQuery<DealHeaderRecord | null>({
    queryKey: DEAL_QUERY_KEYS.detail(dealID),
    queryFn: async () => {
      if (!dealID) return null;
      const res = await getDealById(dealID);
      if (res && res.success && res.data) {
        return res.data;
      }
      if (res && !res.success) {
        throw new Error(res.error || 'Failed to fetch deal details');
      }
      return null;
    },
    // Instantly seed data from any deals list currently in memory!
    initialData: () => {
      if (!dealID) return undefined;
      const queries = queryClient.getQueriesData<DealHeaderRecord[]>({ queryKey: DEAL_QUERY_KEYS.all });
      for (const [, list] of queries) {
        if (Array.isArray(list)) {
          const match = list.find((d) => Number(d.dealID) === Number(dealID));
          if (match) return match;
        }
      }
      return undefined;
    },
    initialDataUpdatedAt: () => Date.now(),
    enabled: !!dealID && enabled,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Mutation hook to adjust When-To-Notify (WTN) date with real-time optimistic update
 */
export function useUpdateWTNMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateWTNPayload) => updateWTN(payload),
    onMutate: async (payload) => {
      const dealID = Number(payload.wtn_dealID || (payload as any).dealID);
      const rawDate = payload.dtwtn || payload.whenToNotify;
      const wtnDate = rawDate ? new Date(rawDate) : new Date();

      // Optimistically update list caches
      updateDealsInAllCaches(queryClient, (deal) => {
        if (Number(deal.dealID) === dealID) {
          return {
            ...deal,
            wtn: {
              ...(deal.wtn || { wtnID: 0, dealID }),
              whenToNotify: wtnDate,
            },
          };
        }
        return deal;
      });

      // Optimistically update detail cache
      queryClient.setQueryData<DealHeaderRecord | null>(DEAL_QUERY_KEYS.detail(dealID), (old) => {
        if (!old) return old;
        return {
          ...old,
          wtn: {
            ...(old.wtn || { wtnID: 0, dealID }),
            whenToNotify: wtnDate,
          },
        };
      });
    },
    onSettled: (_, __, variables) => {
      const dealID = Number(variables.wtn_dealID || (variables as any).dealID);
      queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.all });
      if (dealID) {
        queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.detail(dealID) });
      }
    },
  });
}

/**
 * Mutation hook to close a deal as lost with real-time optimistic update
 */
export function useLostDealMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveLostDealPayload) => saveLostDeal(payload),
    onMutate: async (payload) => {
      const dealID = Number(payload.dealID);

      // Optimistically mark as lost in list caches
      updateDealsInAllCaches(queryClient, (deal) => {
        if (Number(deal.dealID) === dealID) {
          return {
            ...deal,
            dealStatus: '7',
            lostInfo: {
              lostID: dealID,
              dealID,
              competitorVendor: payload.competitorVendor || '',
              competitorBrand: payload.competitorBrand || '',
              icsOffer: payload.icsOffer || '',
              competitorOffer: payload.competitorOffer || '',
              reason: payload.reason || '',
              otherInformation: payload.otherInformation ? String(payload.otherInformation) : undefined,
            },
          };
        }
        return deal;
      });

      // Optimistically update detail cache
      queryClient.setQueryData<DealHeaderRecord | null>(DEAL_QUERY_KEYS.detail(dealID), (old) => {
        if (!old) return old;
        return {
          ...old,
          dealStatus: '7',
          lostInfo: {
            lostID: dealID,
            dealID,
            competitorVendor: payload.competitorVendor || '',
            competitorBrand: payload.competitorBrand || '',
            icsOffer: payload.icsOffer || '',
            competitorOffer: payload.competitorOffer || '',
            reason: payload.reason || '',
            otherInformation: payload.otherInformation ? String(payload.otherInformation) : undefined,
          },
        };
      });
    },
    onSettled: (_, __, variables) => {
      const dealID = Number(variables.dealID);
      queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.all });
      if (dealID) {
        queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.detail(dealID) });
      }
    },
  });
}

/**
 * Mutation hook to register a new deal with automated cache invalidation
 */
export function useCreateDealMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDealPayload) => createDeal(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.all });
    },
  });
}

/**
 * Mutation hook to update an existing deal with automated cache invalidation
 */
export function useUpdateDealMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateDealPayload) => updateDeal(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.all });
      if (variables.dealID) {
        queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.detail(Number(variables.dealID)) });
      }
    },
  });
}

/**
 * Mutation hook to record a deal renewal with real-time optimistic update
 */
export function useRenewDealMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveDealRenewalPayload) => saveDealRenewal(payload),
    onMutate: async (payload) => {
      const dealID = Number(payload.dealID);
      const rexpDate = new Date(payload.rexpDt);
      const dtRenewal = new Date(payload.dtRenewal);
      const validityDays = String(payload.validityDays || 90);

      if (payload.renewalID && Number(payload.renewalID) > 0) {
        const renewalID = Number(payload.renewalID);
        const updateRenewalList = (renewals: DealRenewalRecord[] = []) =>
          renewals.map((r) =>
            r.renewalID === renewalID
              ? {
                  ...r,
                  dtRenewal,
                  rexpDt: rexpDate,
                  remarks: payload.remarks || null,
                  dtUpdated: new Date(),
                }
              : r
          );

        // Optimistically update list caches
        updateDealsInAllCaches(queryClient, (deal) => {
          if (Number(deal.dealID) === dealID) {
            const updatedRenewals = updateRenewalList(deal.renewals);
            return {
              ...deal,
              expiration: validityDays,
              expDt: rexpDate,
              dtValidTo: rexpDate,
              renewals: updatedRenewals,
              latestRenewal: updatedRenewals[0] || deal.latestRenewal,
            };
          }
          return deal;
        });

        // Optimistically update detail cache
        queryClient.setQueryData<DealHeaderRecord | null>(DEAL_QUERY_KEYS.detail(dealID), (old) => {
          if (!old) return old;
          const updatedRenewals = updateRenewalList(old.renewals);
          return {
            ...old,
            expiration: validityDays,
            expDt: rexpDate,
            dtValidTo: rexpDate,
            renewals: updatedRenewals,
            latestRenewal: updatedRenewals[0] || old.latestRenewal,
          };
        });
      } else {
        const newRenewal: DealRenewalRecord = {
          renewalID: Date.now(),
          dealID,
          dtRenewal,
          rexpDt: rexpDate,
          remarks: payload.remarks || null,
          dtCreated: new Date(),
        };

        // Optimistically update list caches
        updateDealsInAllCaches(queryClient, (deal) => {
          if (Number(deal.dealID) === dealID) {
            const updatedRenewals = [newRenewal, ...(deal.renewals || [])];
            return {
              ...deal,
              dealStatus: '1',
              expiration: validityDays,
              expDt: rexpDate,
              dtValidTo: rexpDate,
              renewals: updatedRenewals,
              latestRenewal: newRenewal,
            };
          }
          return deal;
        });

        // Optimistically update detail cache
        queryClient.setQueryData<DealHeaderRecord | null>(DEAL_QUERY_KEYS.detail(dealID), (old) => {
          if (!old) return old;
          const updatedRenewals = [newRenewal, ...(old.renewals || [])];
          return {
            ...old,
            dealStatus: '1',
            expiration: validityDays,
            expDt: rexpDate,
            dtValidTo: rexpDate,
            renewals: updatedRenewals,
            latestRenewal: newRenewal,
          };
        });
      }
    },
    onSettled: (_, __, variables) => {
      const dealID = Number(variables.dealID);
      queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.all });
      if (dealID) {
        queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.detail(dealID) });
      }
    },
  });
}
