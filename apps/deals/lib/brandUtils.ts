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
  'AUTODESK',
  'RED HAT',
  'VERTIV',
  'WATCHGUARD',
  'SONICWALL',
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
  'DELL SERVER': 'DELL',
  'DELLSERVER': 'DELL',
  'DELLSERVER PROJECT': 'DELL',

  // Cisco variations
  'CISCO': 'CISCO',
  'CISCO SYSTEMS': 'CISCO',
  'CISCO MERAKI': 'CISCO',
  'MERAKI': 'CISCO',

  // Lenovo variations
  'LENOVO': 'LENOVO',
  'LENOVO ISG': 'LENOVO',
  'LENOVO IDG': 'LENOVO',
  'LENOVO SERVER': 'LENOVO',

  // Microsoft variations
  'MICROSOFT': 'MICROSOFT',
  'MS': 'MICROSOFT',
  'MSFT': 'MICROSOFT',

  // VMware variations
  'VMWARE': 'VMWARE',
  'WMWARE': 'VMWARE',
  'BROADCOM VMWARE': 'VMWARE',
  'OMNISSA VMWARE': 'VMWARE',

  // Fortinet variations
  'FORTINET': 'FORTINET',
  'FORTI': 'FORTINET',
  'FORINET': 'FORTINET',

  // Palo Alto variations
  'PALO ALTO': 'PALO ALTO',
  'PALO ALTO NETWORKS': 'PALO ALTO',
  'PAN': 'PALO ALTO',
  'PANW': 'PALO ALTO',

  // Aruba variations
  'ARUBA': 'ARUBA',
  'ARUBA NETWORKS': 'ARUBA',

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

  // Autodesk / AutoCAD
  'AUTOCAD': 'AUTODESK',
  'AUTODESK': 'AUTODESK',
  'AUTODESK / AUTOCAD': 'AUTODESK',

  // Acer & Asus
  'ACER': 'ACER',
  'ASUS': 'ASUS',

  // Arcserve & Broadcom
  'ARCSERVE': 'ARCSERVE',
  'ARCESERVE': 'ARCSERVE',
  'BROADCOM': 'BROADCOM',
  'BORADCOM': 'BROADCOM',

  // Red Hat, Samsung, Sonicwall, Vertiv, WatchGuard
  'RED HAT': 'RED HAT',
  'REDHAT': 'RED HAT',
  'SAMSUNG': 'SAMSUNG',
  'SAMSUNG TABLET': 'SAMSUNG',
  'SILVER PEAK': 'SILVER PEAK',
  'SILVERPEAK': 'SILVER PEAK',
  'SKETCHUP': 'SKETCHUP',
  'SONICWALL': 'SONICWALL',
  'SONIC WALL': 'SONICWALL',
  'VERTIV': 'VERTIV',
  'VERIV': 'VERTIV',
  'WATCHGUARD': 'WATCHGUARD',
  'WATCGUARD': 'WATCHGUARD',
  'RUIJIE': 'RUIJIE',
  'RUIJIE NETWORKS': 'RUIJIE',
  'OMNISSA': 'OMNISSA',
};

/**
 * Normalizes any raw brand string into a clean, canonical uppercase brand name.
 * Handles case-insensitivity, leading/trailing whitespace, compound project strings, and abbreviations.
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

  // 2. HP Poly check first (to prevent generic HP match on HP Poly variants)
  if (upper.includes('POLY') || upper.includes('POLYCOM') || upper.includes('PLANTRONICS')) return 'HP POLY';

  // 3. HPE check (includes HPEHCL ARUBA Project, HPE ARUBA, HP ENTERPRISE, etc.)
  if (upper.startsWith('HPE') || upper.includes('HEWLETT PACKARD ENTERPRISE') || upper.includes('HP ENTERPRISE')) return 'HPE';

  // 4. HPI check
  if (upper.startsWith('HPI') || upper.startsWith('HP INC') || upper === 'HP' || upper.startsWith('HP ')) return 'HPI';

  // 5. DELL check (includes DellServer Project, Dell Technologies, Dell EMC, etc.)
  if (upper.startsWith('DELL') || upper.includes('DELL ') || upper.endsWith(' DELL') || upper.includes('EMC')) return 'DELL';

  // 6. CISCO check
  if (upper.startsWith('CISCO') || upper.includes('CISCO ') || upper.includes('MERAKI')) return 'CISCO';

  // 7. ARUBA check
  if (upper.startsWith('ARUBA') || upper.includes('ARUBA')) return 'ARUBA';

  // 8. LENOVO check
  if (upper.startsWith('LENOVO')) return 'LENOVO';

  // 9. VMWARE check (including Wmware, Broadcom Vmware)
  if (upper.startsWith('VMWARE') || upper.startsWith('WMWARE') || upper.startsWith('VM WARE') || upper.includes('VMWARE')) return 'VMWARE';

  // 10. FORTINET check
  if (upper.startsWith('FORTINET') || upper.startsWith('FORTI') || upper.startsWith('FORINET')) return 'FORTINET';

  // 11. PALO ALTO check
  if (upper.startsWith('PALO ALTO') || upper.startsWith('PALOALTO')) return 'PALO ALTO';

  // 12. AUTODESK check
  if (upper.startsWith('AUTOCAD') || upper.startsWith('AUTODESK')) return 'AUTODESK';

  // 13. SONICWALL check
  if (upper.startsWith('SONICWALL') || upper.startsWith('SONIC WALL')) return 'SONICWALL';

  // 14. WATCHGUARD check
  if (upper.startsWith('WATCHGUARD') || upper.startsWith('WATCH GUARD') || upper.startsWith('WATCGUARD')) return 'WATCHGUARD';

  // 15. TREND MICRO check
  if (upper.startsWith('TREND MICRO') || upper.startsWith('TRENDMICRO')) return 'TREND MICRO';

  // 16. RED HAT check
  if (upper.startsWith('RED HAT') || upper.startsWith('REDHAT')) return 'RED HAT';

  // 17. VERTIV check
  if (upper.startsWith('VERTIV') || upper.startsWith('VERIV')) return 'VERTIV';

  // 18. BROADCOM check
  if (upper.startsWith('BROADCOM') || upper.startsWith('BORADCOM')) return 'BROADCOM';

  // 19. Fallback for custom brands
  return upper;
}

/**
 * Returns all recognized database variants for a given brand name (e.g. 'HPI' -> ['HPI', 'HPi', 'Hpi', 'HP', 'HP Inc', 'Hewlett-Packard']).
 */
export function getBrandVariations(brand: string): string[] {
  if (!brand) return [];
  const norm = normalizeBrandName(brand);
  const variations = new Set<string>([
    brand,
    brand.toLowerCase(),
    brand.toUpperCase(),
    norm,
    norm.toLowerCase(),
    norm.toUpperCase(),
  ]);

  for (const [alias, target] of Object.entries(BRAND_ALIAS_MAP)) {
    if (target === norm) {
      variations.add(alias);
      variations.add(alias.toLowerCase());
      variations.add(alias.charAt(0).toUpperCase() + alias.slice(1).toLowerCase());
    }
  }

  return Array.from(variations);
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
  const isLost =
    statusNum === 2 ||
    statusNum === 7 ||
    statusNum === 8 ||
    statusStr === '2' ||
    statusStr === '7' ||
    statusStr === '8' ||
    Boolean(deal.lostInfo && deal.lostInfo.reason);
  // Active is any non-expired operational deal in Registered, Waiting, Pending, or Won
  const isActive = (isApproved || isWaiting) && !isExpired;

  return { isApproved, isWaiting, isLost, isActive, isExpired };
}

/**
 * Calculates aggregated brand distribution metrics with status breakdown (Active, Approved, Waiting, Lost).
 * Optionally filters to only allowedBrands (e.g. for Product Managers).
 */
export function calculateBrandDistribution(
  deals: DealHeaderRecord[],
  allowedBrands?: string[] | null
): BrandDistributionItem[] {
  const map: Record<string, BrandDistributionItem> = {};
  const normalizedAllowed =
    allowedBrands && allowedBrands.length > 0
      ? allowedBrands.map((b) => normalizeBrandName(b))
      : null;

  deals.forEach((deal) => {
    const brand = normalizeBrandName(deal.brand);
    if (!brand || brand === 'UNSPECIFIED' || brand === 'DEMO ONLY' || brand === 'PC REFRESH 2025 - MANILA' || brand === 'WE') {
      return;
    }

    // Scoped filtering: if allowedBrands is provided (e.g. for PM user), only include matching registered brands
    if (normalizedAllowed && !normalizedAllowed.includes(brand)) {
      return;
    }

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

  return Object.values(map).sort((a, b) => b.totalValue - a.totalValue || b.count - a.count);
}
