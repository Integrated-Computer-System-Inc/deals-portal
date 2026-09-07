/**
 * Shared Business Unit (BU) Normalization & Grouping Utilities
 */

/**
 * 7 Primary / Official Registered Business Units on Dashboard
 */
export const OFFICIAL_REGISTERED_BUS = [
  'BU5',
  'BU8',
  'BU2',
  'BU12',
  'CE01',
  'BU1',
  'BU10',
] as const;

export type OfficialBUCode = (typeof OFFICIAL_REGISTERED_BUS)[number];

/**
 * Normalizes Business Unit names and merges aliases into canonical BU codes.
 * e.g., 'Cebu Sales', 'cebu sales', 'CEBU' -> 'CE01'
 */
export function normalizeBU(rawBu: string | null | undefined): string {
  if (!rawBu) return 'Unassigned';
  const trimmed = rawBu.trim();
  if (!trimmed) return 'Unassigned';

  const upper = trimmed.toUpperCase();

  // Merge Cebu Sales variations into canonical CE01
  if (
    upper === 'CE01' ||
    upper === 'CEBU SALES' ||
    upper === 'CEBU' ||
    upper === 'CEBU-SALES' ||
    upper === 'CEBU BRANCH' ||
    upper === 'CEBU_SALES'
  ) {
    return 'CE01';
  }

  // Standardize BU casing (e.g., 'bu1', 'bu 1' -> 'BU1')
  const buMatch = upper.match(/^BU\s*(\d+)$/);
  if (buMatch) {
    return `BU${buMatch[1]}`;
  }

  return trimmed;
}

/**
 * Checks if a BU belongs to the 7 official registered business units.
 */
export function isOfficialBU(rawBu: string | null | undefined): boolean {
  const normalized = normalizeBU(rawBu);
  return (OFFICIAL_REGISTERED_BUS as readonly string[]).includes(normalized);
}

/**
 * Filters a list of deals to only include those belonging to the 7 official registered BUs.
 */
export function filterOfficialDeals<T extends { BU?: string | null; bu?: string | null }>(deals: T[]): T[] {
  return deals.filter((d) => isOfficialBU(d.BU || d.bu));
}
