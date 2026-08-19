'use client';

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
  UpdateWTNPayload,
} from '@my-app/types';

export const DEAL_QUERY_KEYS = {
  all: ['deals'] as const,
  lists: () => [...DEAL_QUERY_KEYS.all, 'list'] as const,
  list: (filter?: ScopedDealsFilter) => [...DEAL_QUERY_KEYS.lists(), filter] as const,
  details: () => [...DEAL_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number | null) => [...DEAL_QUERY_KEYS.details(), id] as const,
};

/**
 * Hook to retrieve filtered/scoped active deals with TanStack Query caching
 */
export function useDealsQuery(filter?: ScopedDealsFilter) {
  return useQuery<DealHeaderRecord[]>({
    queryKey: DEAL_QUERY_KEYS.list(filter),
    queryFn: async () => {
      const res = await getScopedDeals(filter || {});
      if (res && res.success && Array.isArray(res.data)) {
        return res.data;
      }
      throw new Error(res?.error || 'Failed to fetch deals');
    },
    staleTime: 1000 * 60 * 5, // Fresh for 5 minutes (instant page switching)
    gcTime: 1000 * 60 * 30, // Retained in memory for 30 minutes
  });
}

/**
 * Hook to retrieve a single deal record by ID
 */
export function useDealQuery(dealID: number | null, enabled = true) {
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
    enabled: !!dealID && enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

/**
 * Mutation hook to adjust When-To-Notify (WTN) date with automated cache invalidation
 */
export function useUpdateWTNMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateWTNPayload) => updateWTN(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.all });
      if (variables.dealID) {
        queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.detail(variables.dealID) });
      }
    },
  });
}

/**
 * Mutation hook to close a deal as lost with automated cache invalidation
 */
export function useLostDealMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveLostDealPayload) => saveLostDeal(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.all });
      if (variables.dealID) {
        queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.detail(variables.dealID) });
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
 * Mutation hook to record a deal renewal with automated cache invalidation
 */
export function useRenewDealMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveDealRenewalPayload) => saveDealRenewal(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.all });
      if (variables.dealID) {
        queryClient.invalidateQueries({ queryKey: DEAL_QUERY_KEYS.detail(Number(variables.dealID)) });
      }
    },
  });
}

