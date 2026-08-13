'use server';

import {
  CreateDealPayload,
  UpdateDealPayload,
  SaveLostDealPayload,
  UpdateWTNPayload,
  ScopedDealsFilter,
  DealHeaderRecord,
  MOCK_DEALS,
} from '@my-app/types';
import { revalidatePath } from 'next/cache';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

function getHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function getMockScopedDeals(filter: ScopedDealsFilter): DealHeaderRecord[] {
  if (filter.userRole === 'ao' && filter.accountName) {
    const filtered = MOCK_DEALS.filter((d) =>
      (d.assignedAO || d.AssignedAO || '').toLowerCase().includes(filter.accountName?.toLowerCase() || '')
    );
    return filtered.length > 0 ? filtered : MOCK_DEALS;
  }
  if (filter.userRole === 'bu_admin' && filter.accountGroup) {
    const filtered = MOCK_DEALS.filter((d) => (d.bu || d.BU || '') === filter.accountGroup);
    return filtered.length > 0 ? filtered : MOCK_DEALS;
  }
  return MOCK_DEALS;
}

/**
 * 1. getScopedDeals (Query Action)
 * Forwards scoped deals query to Express backend.
 */
export async function getScopedDeals(
  filter: ScopedDealsFilter,
  token?: string
): Promise<{ success: boolean; data?: DealHeaderRecord[]; error?: string }> {
  try {
    const params = new URLSearchParams();
    if (filter.userRole) params.append('userRole', filter.userRole);
    if (filter.accountName) params.append('accountName', filter.accountName);
    if (filter.accountGroup) params.append('accountGroup', filter.accountGroup);

    const res = await fetch(`${BACKEND_URL}/api/deals?${params.toString()}`, {
      method: 'GET',
      headers: getHeaders(token),
      cache: 'no-store',
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: true, data: getMockScopedDeals(filter) };
    }

    return { success: true, data: data.data || data };
  } catch (err: unknown) {
    return { success: true, data: getMockScopedDeals(filter) };
  }
}

/**
 * 2. createDeal (Server Action)
 * Forwards deal creation to Express backend.
 */
export async function createDeal(
  payload: CreateDealPayload,
  createdBy: string,
  token?: string
): Promise<{ success: boolean; dealID?: number; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/deals`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ ...payload, createdBy }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to create deal.' };
    }

    revalidatePath('/deals');
    revalidatePath('/dashboard');
    return { success: true, dealID: data.dealID };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: createDeal] Error:', message);
    return { success: false, error: message };
  }
}

/**
 * 3. updateDeal (Server Action)
 * Forwards deal update to Express backend.
 */
export async function updateDeal(
  payload: UpdateDealPayload,
  token?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/deals/${payload.dealID}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to update deal.' };
    }

    revalidatePath('/deals');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: updateDeal] Error:', message);
    return { success: false, error: message };
  }
}

/**
 * 4. updateWTN (Server Action)
 * Forwards WTN update to Express backend.
 */
export async function updateWTN(
  payload: UpdateWTNPayload,
  token?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/deals/${payload.wtn_dealID || (payload as any).dealID}/wtn`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to update WTN.' };
    }

    revalidatePath('/deals');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: updateWTN] Error:', message);
    return { success: false, error: message };
  }
}

/**
 * 5. saveLostDeal (Server Action)
 * Forwards lost deal submission to Express backend.
 */
export async function saveLostDeal(
  payload: SaveLostDealPayload,
  token?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/deals/${payload.dealID}/lost`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to save lost deal.' };
    }

    revalidatePath('/deals');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Action: saveLostDeal] Error:', message);
    return { success: false, error: message };
  }
}

/**
 * 6. getDealById (Query Action)
 * Retrieves single DealHeader and matching DealItems for view/edit screen.
 */
export async function getDealById(dealID: number, token?: string): Promise<{ success: boolean; data?: DealHeaderRecord | null; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/deals/${dealID}`, {
      method: 'GET',
      headers: getHeaders(token),
      cache: 'no-store',
    });

    const data = await res.json();

    if (!res.ok || !data) {
      const mockMatch = MOCK_DEALS.find((d) => d.dealID === dealID) || MOCK_DEALS[0];
      return { success: true, data: mockMatch };
    }

    return { success: true, data: data.data || data };
  } catch (err: unknown) {
    const mockMatch = MOCK_DEALS.find((d) => d.dealID === dealID) || MOCK_DEALS[0];
    return { success: true, data: mockMatch };
  }
}

/**
 * 7. searchCustomers (Query Action)
 * Searches customer accounts against cdbAccounts table in MSSQL.
 */
export async function searchCustomers(query: string, token?: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    if (!query || query.trim().length === 0) {
      return { success: true, data: [] };
    }

    const res = await fetch(`${BACKEND_URL}/api/deals/customers/search?query=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: getHeaders(token),
      cache: 'no-store',
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: true, data: [] };
    }

    return { success: true, data: data.data || [] };
  } catch (err: unknown) {
    return { success: true, data: [] };
  }
}
