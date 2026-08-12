/**
 * Deals Registration Portal Data Contracts & Shared Types
 */

export interface DealItemInput {
  itemDesc: string;
  qty: number;
  currency: string;
  totalAmt: number;
}

export interface CreateDealPayload {
  dtRegistered: string | Date;
  expDt: string | Date;
  brand: string;
  customerID: string;
  projectName: string;
  assignedAO: string;
  bu: string;
  dealStatus: number;
  custName: string;
  remarks?: string;
  items: DealItemInput[];
}

export interface UpdateDealPayload {
  dealID: number;
  dtRegistered: string | Date;
  expDt: string | Date;
  brand: string;
  customerID: string;
  projectName: string;
  assignedAO: string;
  bu: string;
  dealStatus: number;
  custName: string;
  remarks?: string;
  items: DealItemInput[];
}

export interface SaveLostDealPayload {
  dealID: number;
  competitorVendor: string;
  competitorBrand: string;
  icsOffer: number;
  competitorOffer: number;
  reason: string;
  otherInformation?: string;
}

export interface UpdateWTNPayload {
  dealID: number;
  whenToNotify: string | Date;
}

export type UserRole = 'admin' | 'ao' | 'bu_admin';

export interface ScopedDealsFilter {
  userRole: UserRole;
  accountName?: string;
  accountGroup?: string;
}

export interface CurrencyTotals {
  [currency: string]: number;
}

export interface DealItemRecord extends DealItemInput {
  itemID: number;
  dealID: number;
}

export interface DealWTNRecord {
  wtnID: number;
  dealID: number;
  whenToNotify: string | Date;
}

export interface DealResponseRecord {
  responseID: number;
  dealID: number;
  responseDays: number;
}

export interface DealLostRecord {
  lostID: number;
  dealID: number;
  competitorVendor: string;
  competitorBrand: string;
  icsOffer: number;
  competitorOffer: number;
  reason: string;
  otherInformation?: string;
}

export interface DealHeaderRecord {
  dealID: number;
  dtRegistered: Date;
  expiration: Date;
  expDt: Date;
  brand: string;
  customerID: string;
  dealRegID: string;
  projectName: string;
  assignedAO: string;
  bu: string;
  dealStatus: number;
  createdBy: string;
  custName: string;
  remarks?: string | null;
  dtCreated: Date;
  items?: DealItemRecord[];
  wtn?: DealWTNRecord | null;
  response?: DealResponseRecord | null;
  lostInfo?: DealLostRecord | null;
  aggregatedTotals?: CurrencyTotals;
}
