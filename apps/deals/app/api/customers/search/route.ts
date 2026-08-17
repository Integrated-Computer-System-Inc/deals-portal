import { NextRequest, NextResponse } from 'next/server';
import { rankCustomersByRelevance, cleanCorporateName, normalizeBusinessUnit } from '@/lib/searchUtils';
import { CustomerLookupResult } from '@my-app/types';

export const dynamic = 'force-dynamic';

/**
 * Helper to query the external ICE CREAM liveSearch API safely
 */
async function fetchIceCreamQuery(term: string): Promise<any[]> {
  try {
    const trimmed = (term || '').trim();
    if (trimmed.length < 2) return [];

    const encodedKey = encodeURIComponent(Buffer.from(trimmed).toString('base64'));
    const apiRes = await fetch(`https://ice-cream.ics.com.ph/api/liveSearch?key=${encodedKey}`, {
      signal: AbortSignal.timeout(5000),
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!apiRes.ok) return [];

    const rawData = await apiRes.json();
    return Array.isArray(rawData) ? rawData : (rawData.data || []);
  } catch (err) {
    // Gracefully handle timeout or network error for individual sub-query
    return [];
  }
}

/**
 * Normalizes raw ICE CREAM items into CustomerLookupResult candidates
 */
function ingestRawItems(items: any[], candidateMap: Map<string, CustomerLookupResult>) {
  for (const item of items) {
    // Exclude inactive records
    const isExplicitlyInactive =
      item.is_active === '0' ||
      item.is_active === 0 ||
      item.isActive === false ||
      item.status === '0' ||
      item.status === 0 ||
      String(item.is_active || '').toLowerCase() === 'inactive' ||
      String(item.status || '').toLowerCase() === 'inactive' ||
      String(item.Status || '').toLowerCase() === 'inactive';

    if (isExplicitlyInactive) {
      continue;
    }

    const customerID = item.CustomerID || item.CustomerNumber || `CUST-${item.id || 'N/A'}`;
    const custName = item.CustomerName || 'Unknown Account';
    const rawBuValue = item.BU ?? item.bu ?? item.BusinessUnit ?? item.AccountGroup ?? item.Division ?? item.SalesGroup ?? item.bu_code ?? 'BU5';
    const bu = normalizeBusinessUnit(rawBuValue);
    const assignedAO = item.AO || item.ao || item.AssignedAO || 'Assigned AO';
    const isActive = true;
    const createdDate = item.DateCreated;
    const createdBy = item.CreatedBy;

    // Unique key per (customerID, bu, assignedAO, custName)
    const uniqueKey = `${customerID}-${bu}-${assignedAO}-${custName}`.toLowerCase();
    if (!candidateMap.has(uniqueKey)) {
      candidateMap.set(uniqueKey, {
        customerID,
        custName,
        bu,
        assignedAO,
        isActive,
        createdDate,
        createdBy,
      });
    }
  }
}

/**
 * GET /api/customers/search?q=<query>
 * Smart proxy endpoint with multi-word fan-out, typo tolerance, and fuzzy relevance ranking.
 * Pure read-only API with zero database overhead.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || searchParams.get('query') || '';
    const cleanQuery = query.trim().replace(/\s+/g, ' ');

    if (cleanQuery.length < 2) {
      return NextResponse.json(
        { success: true, data: [] },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          },
        }
      );
    }

    const candidateMap = new Map<string, CustomerLookupResult>();

    // 1. Primary Query: Search exact cleaned phrase
    const primaryItems = await fetchIceCreamQuery(cleanQuery);
    ingestRawItems(primaryItems, candidateMap);

    // 2. Smart Fallback: If results are few (< 3) and query has multiple words or noise terms, fan out to sub-tokens
    const strippedCorporate = cleanCorporateName(cleanQuery);
    const queryWords = cleanQuery.split(/\s+/).filter((w) => w.length >= 3);

    const fallbackTerms = new Set<string>();

    if (strippedCorporate && strippedCorporate !== cleanQuery.toLowerCase() && strippedCorporate.length >= 2) {
      fallbackTerms.add(strippedCorporate);
    }

    // Add significant individual words if full query returned few results
    if (candidateMap.size < 3 && queryWords.length > 1) {
      queryWords.forEach((w) => {
        if (w.length >= 3) {
          fallbackTerms.add(w);
        }
      });
    }

    // Execute fallback queries in parallel if any exist
    if (fallbackTerms.size > 0 && candidateMap.size < 5) {
      const fallbackPromises = Array.from(fallbackTerms)
        .slice(0, 3) // Limit to top 3 sub-queries to prevent flooding
        .map((t) => fetchIceCreamQuery(t));

      const fallbackResults = await Promise.allSettled(fallbackPromises);
      for (const res of fallbackResults) {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          ingestRawItems(res.value, candidateMap);
        }
      }
    }

    const candidateList = Array.from(candidateMap.values());

    // 3. Multi-tier Fuzzy & Relevance Ranking
    const rankedResults = rankCustomersByRelevance(candidateList, cleanQuery);

    return NextResponse.json(
      { success: true, data: rankedResults },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[/api/customers/search] Error querying ICE CREAM API:', message);
    return NextResponse.json(
      { success: false, data: [], error: 'Failed to search live customer accounts' },
      { status: 500 }
    );
  }
}
