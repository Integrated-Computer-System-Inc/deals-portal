// Web Worker for off-thread heavy data processing, metric aggregation, and multi-field search filtering.
// This keeps the main UI thread at 60fps with zero stuttering during fast tab switching and rapid search typing.

import { DealHeaderRecord } from '@my-app/types';

export interface WorkerAnalyticsResult {
  brandDistribution: Array<{
    brand: string;
    count: number;
    totalValue: number;
    percentage: number;
    activeCount: number;
    approvedCount: number;
    waitingCount: number;
  }>;
  buDistribution: Array<{
    bu: string;
    count: number;
    totalValue: number;
    percentage: number;
    activeCount: number;
    approvedCount: number;
    waitingCount: number;
    lostCount: number;
  }>;
  expiryAnalytics: {
    totalAtRisk: number;
    criticalCount: number;
    warningCount: number;
    expiredThisMonth: number;
  };
  totalPipelineValue: number;
}

function normalizeBrandName(brandName?: string | null): string {
  if (!brandName) return 'Unassigned';
  const trimmed = brandName.trim();
  if (!trimmed) return 'Unassigned';
  const lower = trimmed.toLowerCase();
  if (lower.includes('dell')) return 'DELL';
  if (lower.includes('hpe') || lower.includes('hewlett packard')) return 'HPE';
  if (lower.includes('hp') || lower.includes('inc.')) return 'HP Inc.';
  if (lower.includes('lenovo')) return 'Lenovo';
  if (lower.includes('cisco')) return 'Cisco';
  if (lower.includes('huawei')) return 'Huawei';
  if (lower.includes('microsoft')) return 'Microsoft';
  if (lower.includes('vmware')) return 'VMware';
  if (lower.includes('fortinet')) return 'Fortinet';
  if (lower.includes('aruba')) return 'Aruba';
  if (lower.includes('sophos')) return 'Sophos';
  if (lower.includes('nutanix')) return 'Nutanix';
  if (lower.includes('oracle')) return 'Oracle';
  if (lower.includes('ibm')) return 'IBM';
  if (lower.includes('apc') || lower.includes('schneider')) return 'APC';
  if (lower.includes('epson')) return 'Epson';
  return trimmed.toUpperCase();
}

function normalizeBU(rawBu?: string | null): string {
  if (!rawBu) return 'Unassigned';
  const trimmed = rawBu.trim();
  if (!trimmed) return 'Unassigned';
  const match = trimmed.match(/^BU\s*[-_]?\s*(\d+)$/i);
  if (match) return `BU${match[1]}`;
  if (/^\d+$/.test(trimmed)) return `BU${trimmed}`;
  return trimmed.toUpperCase();
}

function computeAnalytics(deals: DealHeaderRecord[]): WorkerAnalyticsResult {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let grandTotal = 0;
  let totalAtRisk = 0;
  let criticalCount = 0;
  let warningCount = 0;
  let expiredThisMonth = 0;

  const brandMap: Record<
    string,
    {
      brand: string;
      count: number;
      totalValue: number;
      activeCount: number;
      approvedCount: number;
      waitingCount: number;
    }
  > = {};

  const buMap: Record<
    string,
    {
      bu: string;
      count: number;
      totalValue: number;
      activeCount: number;
      approvedCount: number;
      waitingCount: number;
      lostCount: number;
    }
  > = {};

  const totalDealsCount = deals.length;

  for (let i = 0; i < totalDealsCount; i++) {
    const deal = deals[i];
    const brand = normalizeBrandName(deal.brand);
    const bu = normalizeBU(deal.BU || deal.bu);
    const st = String(deal.dealStatus || '1');

    // Calculate deal amount
    let dealAmt = 0;
    if (deal.items && deal.items.length > 0) {
      for (let j = 0; j < deal.items.length; j++) {
        dealAmt += Number(deal.items[j].totalAmt) || 0;
      }
    }
    grandTotal += dealAmt;

    // Brand map aggregation
    if (!brandMap[brand]) {
      brandMap[brand] = {
        brand,
        count: 0,
        totalValue: 0,
        activeCount: 0,
        approvedCount: 0,
        waitingCount: 0,
      };
    }
    brandMap[brand].count += 1;
    brandMap[brand].totalValue += dealAmt;
    if (st === '1') brandMap[brand].activeCount += 1;
    else if (st === '2') brandMap[brand].approvedCount += 1;
    else if (st === '3') brandMap[brand].waitingCount += 1;

    // BU map aggregation
    if (!buMap[bu]) {
      buMap[bu] = {
        bu,
        count: 0,
        totalValue: 0,
        activeCount: 0,
        approvedCount: 0,
        waitingCount: 0,
        lostCount: 0,
      };
    }
    buMap[bu].count += 1;
    buMap[bu].totalValue += dealAmt;
    if (st === '1') buMap[bu].activeCount += 1;
    else if (st === '2' || st === '3') buMap[bu].approvedCount += 1;
    else if (st === '0' || st === '4') buMap[bu].waitingCount += 1;
    else if (st === '7' || st === '8') buMap[bu].lostCount += 1;

    // Expiry & SLA risk calculations
    const rawExp = deal.expDt || deal.expiration;
    if (rawExp) {
      const expDate = new Date(rawExp);
      if (!isNaN(expDate.getTime())) {
        const diffMs = expDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (daysRemaining > 0 && daysRemaining <= 30 && st !== '7' && st !== '8') {
          totalAtRisk += 1;
          if (daysRemaining <= 3) criticalCount += 1;
          else warningCount += 1;
        }

        if (
          expDate.getFullYear() === currentYear &&
          expDate.getMonth() === currentMonth &&
          expDate < now
        ) {
          expiredThisMonth += 1;
        }
      }
    }
  }

  // Sort and calculate percentages for Brand distribution
  const brandDistribution = Object.values(brandMap)
    .sort((a, b) => b.totalValue - a.totalValue || b.count - a.count)
    .map((item) => ({
      ...item,
      percentage: totalDealsCount > 0 ? (item.count / totalDealsCount) * 100 : 0,
    }));

  // Sort and calculate percentages for BU distribution
  const buDistribution = Object.values(buMap)
    .sort((a, b) => b.totalValue - a.totalValue || b.count - a.count)
    .map((item) => ({
      ...item,
      percentage: totalDealsCount > 0 ? (item.count / totalDealsCount) * 100 : 0,
    }));

  return {
    brandDistribution,
    buDistribution,
    expiryAnalytics: {
      totalAtRisk,
      criticalCount,
      warningCount,
      expiredThisMonth,
    },
    totalPipelineValue: grandTotal,
  };
}

function filterDeals(deals: DealHeaderRecord[], query: string): DealHeaderRecord[] {
  if (!query || !query.trim()) return deals;
  const q = query.toLowerCase().trim();

  return deals.filter((d) => {
    const reg = (d.dealRegID || '').toLowerCase();
    const cust = (d.custName || '').toLowerCase();
    const proj = (d.ProjectName || d.projectName || '').toLowerCase();
    const brand = (d.brand || '').toLowerCase();
    const bu = (d.BU || d.bu || '').toLowerCase();
    const ao = (d.AssignedAO || d.assignedAO || '').toLowerCase();
    const rem = (d.remarks || '').toLowerCase();

    return (
      reg.includes(q) ||
      cust.includes(q) ||
      proj.includes(q) ||
      brand.includes(q) ||
      bu.includes(q) ||
      ao.includes(q) ||
      rem.includes(q)
    );
  });
}

// Worker message listener
self.onmessage = (event: MessageEvent) => {
  const { id, type, payload } = event.data;

  try {
    if (type === 'COMPUTE_ANALYTICS') {
      const result = computeAnalytics(payload.deals || []);
      self.postMessage({ id, success: true, data: result });
    } else if (type === 'FILTER_DEALS') {
      const result = filterDeals(payload.deals || [], payload.query || '');
      self.postMessage({ id, success: true, data: result });
    } else {
      self.postMessage({ id, success: false, error: `Unknown task type: ${type}` });
    }
  } catch (err: any) {
    self.postMessage({ id, success: false, error: err?.message || 'Worker processing error' });
  }
};
