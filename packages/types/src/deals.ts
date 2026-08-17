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
  customerID?: number | string | null;
  dealRegID?: string;
  projectName?: string;
  ProjectName?: string;
  assignedAO?: string;
  AssignedAO?: string;
  bu?: string;
  BU?: string;
  dealStatus: string | number;
  custName: string;
  remarks?: string;
  toEmail?: boolean;
  items: DealItemInput[];
}

export interface UpdateDealPayload {
  dealID: number;
  dtRegistered: string | Date;
  expDt: string | Date;
  brand: string;
  customerID?: number | string | null;
  dealRegID?: string;
  projectName?: string;
  ProjectName?: string;
  assignedAO?: string;
  AssignedAO?: string;
  bu?: string;
  BU?: string;
  dealStatus: string | number;
  custName: string;
  remarks?: string;
  toEmail?: boolean;
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
  wtn_dealID?: number;
  dealID?: number;
  dtwtn?: string | Date;
  whenToNotify?: string | Date;
}

export type UserRole = 'admin' | 'bu' | 'ao' | 'aa' | 'bu_admin';

export interface ScopedDealsFilter {
  userRole?: UserRole;
  accountName?: string;
  accountGroup?: string;
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  statusFilter?: string;
  buFilter?: string;
  brandFilter?: string;
}

export interface PaginatedDealsResult {
  deals: DealHeaderRecord[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
  expiration: Date | string | null;
  expDt: Date;
  brand: string;
  customerID: number | string | null;
  dealRegID: string;
  ProjectName: string;
  projectName?: string;
  AssignedAO: string;
  assignedAO?: string;
  BU: string;
  bu?: string;
  dealStatus: string | number;
  createdBy: string;
  custName: string;
  remarks?: string | null;
  dtCreated: Date;
  dtValidTo?: Date | null;
  items?: DealItemRecord[];
  wtn?: DealWTNRecord | null;
  response?: DealResponseRecord | null;
  lostInfo?: DealLostRecord | null;
  aggregatedTotals?: CurrencyTotals;
}

export const ACTIVE_BUSINESS_UNITS = [
  'BU1',
  'BU2',
  'BU3',
  'BU4',
  'BU5',
  'BU6',
  'BU7',
  'BU8',
  'BU9',
  'BU10',
  'BU11',
  'BU12',
] as const;
export const ALL_BUSINESS_UNITS = [...ACTIVE_BUSINESS_UNITS];
export type BusinessUnitCode = (typeof ACTIVE_BUSINESS_UNITS)[number];

export const DEAL_STATUS_MAP: Record<number, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted' | 'accent' }> = {
  1: { label: 'Registered', variant: 'success' },
  2: { label: 'Declined', variant: 'danger' },
  3: { label: 'Waiting', variant: 'info' },
  4: { label: 'Pending', variant: 'warning' },
  5: { label: 'Expired', variant: 'muted' },
  6: { label: 'Won', variant: 'accent' },
  7: { label: 'Lost', variant: 'danger' },
  8: { label: 'Lost', variant: 'danger' },
};

export interface LiveSearchCustomerItem {
  is_active: string | null;
  CustomerID: string;
  CustomerTypeCode: string;
  CustomerName: string;
  CustomerNumber: string;
  SalesGroup: string | null;
  DistributionChannel: string | null;
  Division: string | null;
  BU: string | null;
  AO: string | null;
  F9: string;
  Reason: string;
  CustomerType: string;
  trDate: string;
  OLDAO: string | null;
  addressID: string | null;
  SourceDB: string;
  DateCreated: string;
  CreatedBy: string;
}

export interface CustomerLookupResult {
  customerID: string;
  custName: string;
  bu: string;
  assignedAO: string;
  isActive?: boolean;
  createdDate?: string;
  createdBy?: string;
  matchTier?: 'exact' | 'prefix' | 'token' | 'synonym' | 'fuzzy';
  isManual?: boolean;
}

export const MOCK_CUSTOMERS: CustomerLookupResult[] = [
  { customerID: 'CUST-3184', custName: 'HEALTHPROOF (MANILA) INC.', bu: 'BU5', assignedAO: 'ABEGAIL CEBUJANO' },
  { customerID: 'CUST-0054', custName: 'Security Bank Corp', bu: 'BU5', assignedAO: 'DANIELLE CARAGAY' },
  { customerID: 'CUST-0022', custName: 'MaplesFS (Manila) Inc', bu: 'BU8', assignedAO: 'CELINA ORNUM' },
  { customerID: 'CUST-5488', custName: 'IQOR PHILIPPINES, INC.', bu: 'BU2', assignedAO: 'AILEEN DENIÑA' },
  { customerID: 'CUST-5489', custName: '3M PHILS., INC.', bu: 'BU2', assignedAO: 'AILEEN DENIÑA' },
  { customerID: 'CUST-2238', custName: 'Department of Health', bu: 'BU5', assignedAO: 'CAMILLE KILAKIGA' },
  { customerID: 'CUST-5488', custName: 'NIKE PHILS.', bu: 'BU8', assignedAO: 'JOENALIZA MANDIA' },
  { customerID: 'CUST-2239', custName: 'ASIA UNITED BANK', bu: 'BU8', assignedAO: 'TRACY LABANDA' },
  { customerID: 'CUST-5487', custName: 'MERCEDES - BENZ GROUP SERVICES PHILS., INC.', bu: 'BU1', assignedAO: 'JECK DUHAYLUNGSOD' },
];

export const MOCK_DEALS: DealHeaderRecord[] = [
  {
    dealID: 31842219,
    dealRegID: '31842219',
    dtRegistered: new Date('2026-08-12'),
    expiration: new Date('2026-11-10'),
    expDt: new Date('2026-11-10'),
    brand: 'Dell',
    customerID: 'CUST-3184',
    custName: 'HEALTHPROOF (MANILA) INC.',
    ProjectName: '2026 Dell Laptops',
    AssignedAO: 'ABEGAIL CEBUJANO',
    BU: 'BU5',
    dealStatus: 1, // Registered
    createdBy: 'acebujano',
    remarks: 'extended. Re-DR of 30328466',
    dtCreated: new Date('2026-08-12T08:00:00Z'),
    response: { responseID: 1, dealID: 31842219, responseDays: 264 },
    wtn: { wtnID: 1, dealID: 31842219, whenToNotify: new Date('2026-11-08') },
    aggregatedTotals: { USD: 117000 },
    items: [
      { itemID: 101, dealID: 31842219, itemDesc: 'Dell Pro 14 PC14250', qty: 225, currency: 'USD', totalAmt: 112500 },
      { itemID: 102, dealID: 31842219, itemDesc: 'Dell Optical Mouse', qty: 225, currency: 'USD', totalAmt: 2250 },
      { itemID: 103, dealID: 31842219, itemDesc: 'Dell Laptop Bag Carrying Case', qty: 225, currency: 'USD', totalAmt: 2250 },
    ],
  },
  {
    dealID: 5491402,
    dealRegID: 'REGI-0005491402',
    dtRegistered: new Date('2026-08-12'),
    expiration: new Date('2026-11-12'),
    expDt: new Date('2026-11-12'),
    brand: 'HPi',
    customerID: 'CUST-0054',
    custName: 'Security Bank Corp',
    ProjectName: 'Frame Agreement_IT Peripherals',
    AssignedAO: 'DANIELLE CARAGAY',
    BU: 'BU5',
    dealStatus: 3, // Waiting
    createdBy: 'dcaragay',
    remarks: 'Enterprise annual hardware refresh',
    dtCreated: new Date('2026-08-12T07:30:00Z'),
    wtn: { wtnID: 2, dealID: 5491402, whenToNotify: new Date('2026-11-02') },
    aggregatedTotals: { PHP: 90000000 },
    items: [
      { itemID: 201, dealID: 5491402, itemDesc: 'HP EliteBook 840 G11', qty: 300, currency: 'PHP', totalAmt: 75000000 },
      { itemID: 202, dealID: 5491402, itemDesc: 'HP USB-C G5 Essential Docks', qty: 300, currency: 'PHP', totalAmt: 15000000 },
    ],
  },
  {
    dealID: 22390427,
    dealRegID: 'REGE-0022390427',
    dtRegistered: new Date('2026-08-11'),
    expiration: new Date('2026-11-09'),
    expDt: new Date('2026-11-09'),
    brand: 'HPe',
    customerID: 'CUST-0022',
    custName: 'MaplesFS (Manila) Inc',
    ProjectName: 'Acquisition of IT equipments',
    AssignedAO: 'CELINA ORNUM',
    BU: 'BU8',
    dealStatus: 1, // Registered
    createdBy: 'cornum',
    remarks: 'Approved with special partner discount',
    dtCreated: new Date('2026-08-11T09:00:00Z'),
    response: { responseID: 2, dealID: 22390427, responseDays: 4 },
    wtn: { wtnID: 3, dealID: 22390427, whenToNotify: new Date('2026-10-30') },
    aggregatedTotals: { PHP: 10000000 },
    items: [
      { itemID: 301, dealID: 22390427, itemDesc: 'HPE ProLiant DL380 Gen11 Server', qty: 4, currency: 'PHP', totalAmt: 10000000 },
    ],
  },
  {
    dealID: 5488933,
    dealRegID: 'REGI-0005488933',
    dtRegistered: new Date('2026-08-11'),
    expiration: new Date('2026-10-15'),
    expDt: new Date('2026-10-15'),
    brand: 'HP Poly',
    customerID: 'CUST-5488',
    custName: 'IQOR PHILIPPINES, INC.',
    ProjectName: 'REQUESTING FOR QUOTATION',
    AssignedAO: 'AILEEN DENIÑA',
    BU: 'BU2',
    dealStatus: 1, // Registered
    createdBy: 'adenina',
    remarks: 'Video conferencing equipment setup',
    dtCreated: new Date('2026-08-11T10:15:00Z'),
    response: { responseID: 3, dealID: 5488933, responseDays: 399 },
    wtn: { wtnID: 4, dealID: 5488933, whenToNotify: new Date('2026-10-05') },
    aggregatedTotals: { USD: 10000 },
    items: [
      { itemID: 401, dealID: 5488933, itemDesc: 'Poly Studio X52 All-in-One Video Bar', qty: 2, currency: 'USD', totalAmt: 10000 },
    ],
  },
  {
    dealID: 5488853,
    dealRegID: 'REGI-0005488853',
    dtRegistered: new Date('2026-08-11'),
    expiration: new Date('2026-11-20'),
    expDt: new Date('2026-11-20'),
    brand: 'Hpi',
    customerID: 'CUST-5489',
    custName: '3M PHILS., INC.',
    ProjectName: 'Procurement of laptops',
    AssignedAO: 'AILEEN DENIÑA',
    BU: 'BU2',
    dealStatus: 1, // Registered
    createdBy: 'adenina',
    remarks: 'Standard corporate deployment',
    dtCreated: new Date('2026-08-11T11:00:00Z'),
    response: { responseID: 4, dealID: 5488853, responseDays: 1719 },
    wtn: { wtnID: 5, dealID: 5488853, whenToNotify: new Date('2026-11-10') },
    aggregatedTotals: { PHP: 5250000 },
    items: [
      { itemID: 501, dealID: 5488853, itemDesc: 'HP ProBook 450 G10', qty: 75, currency: 'PHP', totalAmt: 5250000 },
    ],
  },
  {
    dealID: 22389510,
    dealRegID: 'REGE-0022389510',
    dtRegistered: new Date('2026-08-11'),
    expiration: new Date('2026-12-01'),
    expDt: new Date('2026-12-01'),
    brand: 'HPe',
    customerID: 'CUST-2238',
    custName: 'Department of Health',
    ProjectName: 'Procurement of Physical Servers for the Implementation of DOH Various Health Information System',
    AssignedAO: 'CAMILLE KILAKIGA',
    BU: 'BU5',
    dealStatus: 1, // Registered
    createdBy: 'ckilakiga',
    remarks: 'Government public bidding deal registration',
    dtCreated: new Date('2026-08-11T13:00:00Z'),
    wtn: { wtnID: 6, dealID: 22389510, whenToNotify: new Date('2026-11-21') },
    aggregatedTotals: { PHP: 10000000 },
    items: [
      { itemID: 601, dealID: 22389510, itemDesc: 'HPE Synergy 480 Gen10 Compute Module', qty: 2, currency: 'PHP', totalAmt: 10000000 },
    ],
  },
];
