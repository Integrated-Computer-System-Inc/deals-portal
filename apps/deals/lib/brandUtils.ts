import { DealHeaderRecord } from '@my-app/types';

/**
 * Standard canonical brand names in uppercase
 */
export const CANONICAL_PRESET_BRANDS = [
  'DELL',
  'HPI',
  'HPE',
  'HP POLY',
  'CISCO',
  'MICROSOFT',
  'LENOVO',
  'FORTINET',
  'VMWARE',
  'PALO ALTO',
  'ARUBA',
  'SOPHOS',
  'NUTANIX',
  'APC',
  'ACRONIS',
  'SANGFOR',
  'HUAWEI',
  'TREND MICRO',
  'VEEAM',
  'RUCKUS',
] as const;

/**
 * Maps known variations, typos, and abbreviations to their canonical uppercase brand names
 */
const BRAND_ALIAS_MAP: Record<string, string> = {
  // HPI variations
  'HPI': 'HPI',
  'HPI INC': 'HPI',
  'HP INC': 'HPI',
  'HP INC.': 'HPI',
  'HP': 'HPI',
  'HEWLETT-PACKARD': 'HPI',
  'HEWLETT PACKARD': 'HPI',
  'HP COMMERCIAL': 'HPI',

  // HPE variations
  'HPE': 'HPE',
  'HP ENTERPRISE': 'HPE',
  'HEWLETT PACKARD ENTERPRISE': 'HPE',
  'HEWLETT-PACKARD ENTERPRISE': 'HPE',

  // HP Poly variations
  'HP POLY': 'HP POLY',
  'POLY': 'HP POLY',
  'POLYCOM': 'HP POLY',
  'PLANTRONICS': 'HP POLY',

  // Dell variations
  'DELL': 'DELL',
  'DELL TECHNOLOGIES': 'DELL',
  'DELL EMC': 'DELL',
  'EMC': 'DELL',

  // Cisco variations
  'CISCO': 'CISCO',
  'CISCO SYSTEMS': 'CISCO',
  'CISCO MERAKI': 'CISCO',
  'MERAKI': 'CISCO',

  // Lenovo variations
  'LENOVO': 'LENOVO',
  'LENOVO ISG': 'LENOVO',
  'LENOVO IDG': 'LENOVO',

  // Microsoft variations
  'MICROSOFT': 'MICROSOFT',
  'MS': 'MICROSOFT',
  'MSFT': 'MICROSOFT',

  // VMware variations
  'VMWARE': 'VMWARE',
  'BROADCOM VMWARE': 'VMWARE',

  // Fortinet variations
  'FORTINET': 'FORTINET',
  'FORTI': 'FORTINET',

  // Palo Alto variations
  'PALO ALTO': 'PALO ALTO',
  'PALO ALTO NETWORKS': 'PALO ALTO',
  'PAN': 'PALO ALTO',
  'PANW': 'PALO ALTO',

  // Aruba variations
  'ARUBA': 'ARUBA',
  'ARUBA NETWORKS': 'ARUBA',
  'HPE ARUBA': 'ARUBA',

  // Sophos variations
  'SOPHOS': 'SOPHOS',
  'SOPHOS NETWORKS': 'SOPHOS',

  // Nutanix variations
  'NUTANIX': 'NUTANIX',

  // APC variations
  'APC': 'APC',
  'APC BY SCHNEIDER': 'APC',
  'SCHNEIDER ELECTRIC': 'APC',
  'SCHNEIDER': 'APC',

  // Acronis
  'ACRONIS': 'ACRONIS',

  // Sangfor
  'SANGFOR': 'SANGFOR',

  // Huawei
  'HUAWEI': 'HUAWEI',

  // Trend Micro
  'TREND MICRO': 'TREND MICRO',
  'TRENDMICRO': 'TREND MICRO',

  // Veeam
  'VEEAM': 'VEEAM',
  'VEEAM SOFTWARE': 'VEEAM',

  // Ruckus
  'RUCKUS': 'RUCKUS',
  'RUCKUS NETWORKS': 'RUCKUS',
  'COMMPSCOPE RUCKUS': 'RUCKUS',
};

/**
 * Normalizes any raw brand string into a clean, canonical uppercase brand name.
 * Handles case-insensitivity, leading/trailing whitespace, common punctuation, and abbreviations.
 */
export function normalizeBrandName(rawBrand?: string | null): string {
  if (!rawBrand) return 'UNSPECIFIED';

  const cleaned = rawBrand
    .trim()
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (!cleaned) return 'UNSPECIFIED';

  const upper = cleaned.toUpperCase();

  // 1. Direct alias dictionary lookup
  if (BRAND_ALIAS_MAP[upper]) {
    return BRAND_ALIAS_MAP[upper];
  }

  // 2. Prefix & Substring matching for compound entries
  if (upper.startsWith('HP INC') || upper.startsWith('HPI ')) return 'HPI';
  if (upper.startsWith('HPE ') || upper.startsWith('HEWLETT PACKARD ENTERPRISE')) return 'HPE';
  if (upper.startsWith('DELL ') || upper.endsWith(' DELL')) return 'DELL';
  if (upper.startsWith('CISCO ') || upper.endsWith(' CISCO')) return 'CISCO';
  if (upper.startsWith('LENOVO ')) return 'LENOVO';
  if (upper.startsWith('MICROSOFT ')) return 'MICROSOFT';
  if (upper.startsWith('VMWARE ')) return 'VMWARE';
  if (upper.startsWith('FORTINET ')) return 'FORTINET';
  if (upper.startsWith('PALO ALTO ')) return 'PALO ALTO';
  if (upper.startsWith('ARUBA ')) return 'ARUBA';
  if (upper.startsWith('POLY ') || upper === 'POLY') return 'HP POLY';

  // 3. Fallback for custom brands: Keep in clean uppercase if short or acronym, else standard uppercase
  return upper;
}

export interface BrandDistributionItem {
  brand: string;
  count: number;
  totalValue: number;
  activeCount: number;
  approvedCount: number;
  waitingCount: number;
  lostCount: number;
  currencies: Set<string>;
}

/**
 * Categorizes a deal into Approved, Waiting, Lost, and Active status buckets:
 * - Approved: Status 1 (Registered) & Status 6 (Won)
 * - Waiting: Status 3 (Waiting) & Status 4 (Pending)
 * - Lost: Status 7 (Lost), Status 8 (Cancelled), or deals with lostInfo.reason
 * - Active: Total unexpired operational pipeline deals across statuses 1, 3, 4, 6
 */
export function categorizeDealStatus(deal: DealHeaderRecord) {
  const statusStr = String(deal.dealStatus ?? '1').trim();
  const statusNum = typeof deal.dealStatus === 'number' ? deal.dealStatus : parseInt(statusStr, 10) || 1;

  const now = new Date();
  const rawExp = deal.expDt || deal.expiration;
  let isExpired = false;
  if (rawExp) {
    const expDate = new Date(rawExp);
    if (!isNaN(expDate.getTime()) && expDate < now) {
      isExpired = true;
    }
  }

  const isApproved = statusNum === 1 || statusNum === 6;
  const isWaiting = statusNum === 3 || statusNum === 4;
  const isLost = statusNum === 7 || statusNum === 8 || statusStr === '7' || statusStr === '8' || Boolean(deal.lostInfo && deal.lostInfo.reason);
  // Active is any non-expired operational deal in Registered, Waiting, Pending, or Won
  const isActive = (isApproved || isWaiting) && !isExpired;

  return { isApproved, isWaiting, isLost, isActive, isExpired };
}

/**
 * Calculates aggregated brand distribution metrics with status breakdown (Active, Approved, Waiting, Lost)
 */
export function calculateBrandDistribution(deals: DealHeaderRecord[]): BrandDistributionItem[] {
  const map: Record<string, BrandDistributionItem> = {};

  deals.forEach((deal) => {
    const brand = normalizeBrandName(deal.brand);
    if (!map[brand]) {
      map[brand] = {
        brand,
        count: 0,
        totalValue: 0,
        activeCount: 0,
        approvedCount: 0,
        waitingCount: 0,
        lostCount: 0,
        currencies: new Set<string>(),
      };
    }

    const { isApproved, isWaiting, isLost, isActive } = categorizeDealStatus(deal);

    map[brand].count += 1;
    if (isActive) map[brand].activeCount += 1;
    if (isApproved) map[brand].approvedCount += 1;
    if (isWaiting) map[brand].waitingCount += 1;
    if (isLost) map[brand].lostCount += 1;

    const dealAmt =
      deal.items?.reduce((sum: number, item: any) => sum + (Number(item.totalAmt) || 0), 0) || 0;
    map[brand].totalValue += dealAmt;

    deal.items?.forEach((item: any) => {
      if (item.currency) {
        map[brand].currencies.add(item.currency);
      }
    });
  });

  return Object.values(map).sort((a, b) => b.count - a.count);
}
