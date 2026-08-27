import { UserRole } from '@my-app/types';
import { normalizeBusinessUnit } from './searchUtils';

/**
 * Interface representing resolved role and access scope for an account
 */
export interface ResolvedUserAccess {
  role: UserRole | null;
  assignedBUs: string[];
  roleTitle: string;
  isAuthorized: boolean;
  isBuHead: boolean;
  isAdmin: boolean;
  isAdminAssistant: boolean;
  isAccountOfficer: boolean;
  rejectionReason?: string;
}

/**
 * Explicit mapping registry by AccountID
 *
 * BU Heads:
 * - 926:  MYRNALENE CARANDANG            -> BU1
 * - 205:  ROSETTE DE GUZMAN              -> BU2
 * - 856:  FLORDELIZA RICAFLANCA          -> BU5
 * - 387:  SHIELA MARIE PEÑALOSA-MARCELO -> BU8, BU12, CE01
 * - 310:  PATRICIA LORIA                 -> BU10
 *
 * Admin Assistant:
 * - 57835: ATHENA BEATRICE FRANCISCO    -> aa
 *
 * Admin:
 * - 415:   ADELIANA SY-LU (asy-lu@ics.com.ph) -> admin
 */
export interface AccountRoleConfig {
  accountId: number;
  name: string;
  email?: string;
  domainAccount?: string;
  role: UserRole;
  assignedBUs: string[];
  roleTitle: string;
}

export const ACCOUNT_ROLE_REGISTRY: Record<number, AccountRoleConfig> = {
  // BU Heads
  926: {
    accountId: 926,
    name: 'MYRNALENE CARANDANG',
    email: 'mcarandang@ics.com.ph',
    domainAccount: 'MCARANDANG',
    role: 'bu',
    assignedBUs: ['BU1'],
    roleTitle: 'BU1 Head',
  },
  205: {
    accountId: 205,
    name: 'ROSETTE DE GUZMAN',
    email: 'rdeguzman@ics.com.ph',
    domainAccount: 'RDEGUZMAN',
    role: 'bu',
    assignedBUs: ['BU2'],
    roleTitle: 'BU2 Head',
  },
  856: {
    accountId: 856,
    name: 'FLORDELIZA RICAFLANCA',
    email: 'fricaflanca@ics.com.ph',
    domainAccount: 'FRICAFLANCA',
    role: 'bu',
    assignedBUs: ['BU5'],
    roleTitle: 'BU5 Head',
  },
  387: {
    accountId: 387,
    name: 'SHIELA MARIE PEÑALOSA-MARCELO',
    email: 'smpenalosa@ics.com.ph',
    domainAccount: 'SMPENALOSA',
    role: 'bu',
    assignedBUs: ['BU8', 'BU12', 'CE01'],
    roleTitle: 'BU8 / BU12 / CE01 Head',
  },
  310: {
    accountId: 310,
    name: 'PATRICIA LORIA',
    email: 'ploria@ics.com.ph',
    domainAccount: 'PLORIA',
    role: 'bu',
    assignedBUs: ['BU10'],
    roleTitle: 'BU10 Head',
  },

  // Admin Assistant
  57835: {
    accountId: 57835,
    name: 'ATHENA BEATRICE FRANCISCO',
    email: 'AFRANCISCO@ICS.COM.PH',
    domainAccount: 'AFRANCISCO',
    role: 'aa',
    assignedBUs: [],
    roleTitle: 'Admin Assistant',
  },

  // Admin
  415: {
    accountId: 415,
    name: 'ADELIANA SY-LU',
    email: 'asy-lu@ics.com.ph',
    domainAccount: 'ASY-LU',
    role: 'admin',
    assignedBUs: [],
    roleTitle: 'Administrator',
  },
  1: {
    accountId: 1,
    name: 'BHARON CHRISTOPHER CANDELARIA',
    email: 'bcandelaria@ics.com.ph',
    domainAccount: 'BCANDELARIA',
    role: 'admin',
    assignedBUs: [],
    roleTitle: 'Administrator',
  },
  99999: {
    accountId: 99999,
    name: 'JAMES PAOLO DOREMON',
    email: 'jdoremon@ics.com.ph',
    domainAccount: 'JDOREMON',
    role: 'admin',
    assignedBUs: [],
    roleTitle: 'Administrator',
  },

  // Account Officer (BU8)
  1458: {
    accountId: 1458,
    name: 'TRACY LABANDA',
    email: 'tlabanda@ics.com.ph',
    domainAccount: 'TLABANDA',
    role: 'ao',
    assignedBUs: ['BU8'],
    roleTitle: 'Account Officer (BU8)',
  },
};

export interface ImpersonationPersona {
  accountId: number;
  name: string;
  email: string;
  domainAccount: string;
  role: UserRole;
  assignedBUs: string[];
  roleTitle: string;
  category: 'ADMIN' | 'BU_HEAD' | 'ACCOUNT_OFFICER';
  dealCountDescription?: string;
}

export const IMPERSONATION_PERSONAS: ImpersonationPersona[] = [
  // Superadmin / Admin
  {
    accountId: 415,
    name: 'ADELIANA SY-LU',
    email: 'asy-lu@ics.com.ph',
    domainAccount: 'ASY-LU',
    role: 'admin',
    assignedBUs: [],
    roleTitle: 'Administrator',
    category: 'ADMIN',
    dealCountDescription: 'Full organization-wide access',
  },
  // Admin Assistant
  {
    accountId: 57835,
    name: 'ATHENA BEATRICE FRANCISCO',
    email: 'AFRANCISCO@ICS.COM.PH',
    domainAccount: 'AFRANCISCO',
    role: 'aa',
    assignedBUs: [],
    roleTitle: 'Admin Assistant',
    category: 'ADMIN',
    dealCountDescription: 'Global read/write access',
  },
  // BU Heads
  {
    accountId: 926,
    name: 'MYRNALENE CARANDANG',
    email: 'mcarandang@ics.com.ph',
    domainAccount: 'MCARANDANG',
    role: 'bu',
    assignedBUs: ['BU1'],
    roleTitle: 'BU1 Head',
    category: 'BU_HEAD',
    dealCountDescription: 'BU1 Deals (View Only)',
  },
  {
    accountId: 205,
    name: 'ROSETTE DE GUZMAN',
    email: 'rdeguzman@ics.com.ph',
    domainAccount: 'RDEGUZMAN',
    role: 'bu',
    assignedBUs: ['BU2'],
    roleTitle: 'BU2 Head',
    category: 'BU_HEAD',
    dealCountDescription: 'BU2 Deals (View Only)',
  },
  {
    accountId: 856,
    name: 'FLORDELIZA RICAFLANCA',
    email: 'fricaflanca@ics.com.ph',
    domainAccount: 'FRICAFLANCA',
    role: 'bu',
    assignedBUs: ['BU5'],
    roleTitle: 'BU5 Head',
    category: 'BU_HEAD',
    dealCountDescription: 'BU5 Deals (View Only)',
  },
  {
    accountId: 387,
    name: 'SHIELA MARIE PEÑALOSA-MARCELO',
    email: 'smpenalosa@ics.com.ph',
    domainAccount: 'SMPENALOSA',
    role: 'bu',
    assignedBUs: ['BU8', 'BU12', 'CE01'],
    roleTitle: 'BU8 / BU12 / CE01 Head',
    category: 'BU_HEAD',
    dealCountDescription: 'BU8, BU12, CE01 Deals (View Only)',
  },
  {
    accountId: 310,
    name: 'PATRICIA LORIA',
    email: 'ploria@ics.com.ph',
    domainAccount: 'PLORIA',
    role: 'bu',
    assignedBUs: ['BU10'],
    roleTitle: 'BU10 Head',
    category: 'BU_HEAD',
    dealCountDescription: 'BU10 Deals (View Only)',
  },
  // Account Officer
  {
    accountId: 1458,
    name: 'TRACY LABANDA',
    email: 'tlabanda@ics.com.ph',
    domainAccount: 'TLABANDA',
    role: 'ao',
    assignedBUs: ['BU8'],
    roleTitle: 'Account Officer (BU8)',
    category: 'ACCOUNT_OFFICER',
    dealCountDescription: '635 Deals assigned in BU8 (View Only)',
  },
];

export function getImpersonationPersona(accountId: number): ImpersonationPersona | undefined {
  return IMPERSONATION_PERSONAS.find((p) => p.accountId === accountId);
}

/**
 * Explicit list of authorized Superadmins who can access the Impersonation tool
 */
export const SUPERADMIN_EMAILS: readonly string[] = [
  'jdoremon@ics.com.ph',
  'bcandelaria@ics.com.ph',
];

/**
 * Checks if an email belongs to a designated Superadmin
 */
export function isSuperadminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return SUPERADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === normalized);
}

/**
 * Helper to check if an email is an admin (checks Superadmin list or explicit admin email)
 */
export function isConfiguredAdminEmail(email?: string | null): boolean {
  return isSuperadminEmail(email);
}

/**
 * Resolves the role, assigned business units, and authorization status for an account.
 *
 * Authorization logic:
 * 1. Explicit admin role from Users table OR Superadmin email -> Admin
 * 2. Explicit AccountID registry (BU Heads, Admin Assistant, Admin) -> Configured role
 * 3. Explicit role from Users table -> Stored role
 * 4. Fallback for new users: Validate cdbAccounts
 *    - MUST have AccountType === 'AO' (case-insensitive)
 *    - MUST have isActive === 1
 *    - If both match -> Account Officer ('ao')
 *    - Otherwise -> Rejected (isAuthorized: false)
 *
 * @param accountId Numeric or string AccountID from Users or cdbAccounts
 * @param email Optional email for developer/admin override checks
 * @param accountGroupFallback Optional fallback BU/group from cdbAccounts.AccountGroup
 * @param accountType Optional AccountType from cdbAccounts.AccountType (e.g. 'AO', 'USER', 'CUSTOMER')
 * @param isActive Optional active flag from cdbAccounts.isActive (1 = active, 0 = inactive)
 * @param explicitRole Optional role already stored in Users table (e.g. 'admin', 'bu', 'ao', 'aa')
 */
export function resolveUserRoleAndBUs(
  accountId: number | string,
  email?: string | null,
  accountGroupFallback?: string | null,
  accountType?: string | null,
  isActive?: number | null,
  explicitRole?: UserRole | null
): ResolvedUserAccess {
  const numericId = typeof accountId === 'string' ? parseInt(accountId.replace(/\D/g, ''), 10) : accountId;
  const config = !isNaN(numericId) ? ACCOUNT_ROLE_REGISTRY[numericId] : undefined;

  // 1. Check if explicit role is admin OR email is in SUPERADMIN_EMAILS
  if (explicitRole === 'admin' || isSuperadminEmail(email)) {
    return {
      role: 'admin',
      assignedBUs: config?.assignedBUs || [],
      roleTitle: config?.roleTitle || 'Administrator (IT Superadmin)',
      isAuthorized: true,
      isBuHead: false,
      isAdmin: true,
      isAdminAssistant: false,
      isAccountOfficer: false,
    };
  }

  // 2. Check explicit AccountID configuration in registry
  if (config) {
    return {
      role: config.role,
      assignedBUs: config.assignedBUs,
      roleTitle: config.roleTitle,
      isAuthorized: true,
      isBuHead: config.role === 'bu',
      isAdmin: config.role === 'admin',
      isAdminAssistant: config.role === 'aa',
      isAccountOfficer: config.role === 'ao',
    };
  }

  // 3. Check if an explicit role is already provided from the Users table
  if (explicitRole) {
    const fallbackBUs = accountGroupFallback && accountGroupFallback.trim() ? [accountGroupFallback.trim()] : [];
    return {
      role: explicitRole,
      assignedBUs: fallbackBUs,
      roleTitle: explicitRole === 'bu' ? 'BU Head' : explicitRole === 'aa' ? 'Admin Assistant' : 'Account Officer',
      isAuthorized: true,
      isBuHead: explicitRole === 'bu',
      isAdmin: false,
      isAdminAssistant: explicitRole === 'aa',
      isAccountOfficer: explicitRole === 'ao',
    };
  }

  // 4. Fallback: Validate if account is tagged as an active 'AO' in cdbAccounts
  const normalizedType = (accountType || '').trim().toUpperCase();
  const isActiveAccount = isActive === 1;

  if (normalizedType === 'AO' && isActiveAccount) {
    const fallbackBUs = accountGroupFallback && accountGroupFallback.trim() ? [accountGroupFallback.trim()] : [];
    return {
      role: 'ao',
      assignedBUs: fallbackBUs,
      roleTitle: 'Account Officer',
      isAuthorized: true,
      isBuHead: false,
      isAdmin: false,
      isAdminAssistant: false,
      isAccountOfficer: true,
    };
  }

  // If not an active AO, reject authorization
  const reason =
    normalizedType !== 'AO'
      ? `AccountType '${accountType || 'UNKNOWN'}' is not authorized for portal access. Only AO, BU Heads, and Administrators are permitted.`
      : `Account is inactive (isActive = ${isActive}). Please contact IT Support.`;

  return {
    role: null,
    assignedBUs: [],
    roleTitle: 'Unauthorized User',
    isAuthorized: false,
    isBuHead: false,
    isAdmin: false,
    isAdminAssistant: false,
    isAccountOfficer: false,
    rejectionReason: reason,
  };
}

/**
 * Helper to check if an AccountID corresponds to a BU Head
 */
export function isBuHead(accountId: number | string): boolean {
  const numericId = typeof accountId === 'string' ? parseInt(accountId.replace(/\D/g, ''), 10) : accountId;
  return ACCOUNT_ROLE_REGISTRY[numericId]?.role === 'bu';
}

/**
 * Helper to get assigned BUs for an account
 */
export function getUserAssignedBUs(accountId: number | string, accountGroupFallback?: string | null): string[] {
  const res = resolveUserRoleAndBUs(accountId, undefined, accountGroupFallback);
  return res.assignedBUs;
}

/**
 * Builds Prisma OR conditions for an Account Officer (AO).
 * Matches:
 * 1. AssignedAO exact match
 * 2. AssignedAO contains accountName
 * 3. AssignedAO contains all multi-word name tokens
 * 4. createdBy matches domainAccount, CORP\user, username, or email prefix
 */
export function buildAOScopingConditions(
  accountName?: string | null,
  domainAccount?: string | null,
  email?: string | null
): any[] {
  const orConditions: any[] = [];
  const trimmedName = (accountName || '').trim();

  if (trimmedName) {
    orConditions.push({ AssignedAO: trimmedName });
    orConditions.push({ AssignedAO: { contains: trimmedName } });

    const nameParts = trimmedName.split(/\s+/).filter((p) => p.length > 1);
    if (nameParts.length > 1) {
      orConditions.push({
        AND: nameParts.map((part) => ({
          AssignedAO: { contains: part },
        })),
      });
    }
  }

  // Check createdBy for domain account, email prefix, or raw account name
  const rawDomain = (domainAccount || '').trim();
  const domainUser = rawDomain.replace(/^CORP\\/i, '').trim();
  const emailPrefix = email ? email.split('@')[0].trim() : '';

  const creatorIdentifiers = Array.from(
    new Set([rawDomain, domainUser, `CORP\\${domainUser}`, emailPrefix, trimmedName].filter(Boolean))
  );

  for (const ident of creatorIdentifiers) {
    if (ident) {
      orConditions.push({ createdBy: ident });
      orConditions.push({ createdBy: { contains: ident } });
    }
  }

  return orConditions.length > 0 ? orConditions : [{ AssignedAO: '__NO_MATCH__' }];
}

/**
 * Builds Prisma OR conditions for a Business Unit (BU) Head.
 * Matches any assigned BUs with exact match, normalized format, and substring variations.
 */
export function buildBUScopingConditions(assignedBUs?: string[] | string | null): any[] {
  const buList = Array.isArray(assignedBUs)
    ? assignedBUs
    : (assignedBUs || '').split(',').map((b) => b.trim()).filter(Boolean);

  const orConditions: any[] = [];
  for (const buItem of buList) {
    const trimmed = buItem.trim();
    if (!trimmed) continue;
    const normalized = normalizeBusinessUnit(trimmed);
    orConditions.push(
      { BU: trimmed },
      { BU: normalized },
      { BU: { contains: trimmed } },
      { BU: { contains: normalized } }
    );
  }

  return orConditions.length > 0 ? orConditions : [{ BU: '__NO_MATCH__' }];
}

/**
 * Validates if an individual deal is accessible to a user based on their role and claims.
 */
export function isDealAccessibleByUser(
  deal: { AssignedAO?: string | null; createdBy?: string | null; BU?: string | null } | null | undefined,
  user: {
    role?: UserRole | string | null;
    accountName?: string | null;
    domainAccount?: string | null;
    email?: string | null;
    assignedBUs?: string[] | null;
  }
): boolean {
  if (!deal) return false;
  const role = user.role || 'ao';
  if (role === 'admin' || role === 'aa') {
    return true;
  }

  if (role === 'bu' || role === 'bu_admin') {
    const userBUs = (user.assignedBUs || []).map((b) => b.trim().toUpperCase());
    const dealBU = (deal.BU || '').trim().toUpperCase();
    if (!dealBU) return false;
    return userBUs.some((bu) => dealBU === bu || dealBU.includes(bu) || bu.includes(dealBU));
  }

  if (role === 'ao') {
    const userAccName = (user.accountName || '').trim().toLowerCase();
    const dealAO = (deal.AssignedAO || '').trim().toLowerCase();
    const dealCreatedBy = (deal.createdBy || '').trim().toLowerCase();

    // 1. Check AssignedAO match
    if (userAccName && dealAO) {
      if (dealAO === userAccName || dealAO.includes(userAccName) || userAccName.includes(dealAO)) {
        return true;
      }
      const parts = userAccName.split(/\s+/).filter((p) => p.length > 1);
      if (parts.length > 1 && parts.every((p) => dealAO.includes(p))) {
        return true;
      }
    }

    // 2. Check createdBy match
    const rawDomain = (user.domainAccount || '').trim().toLowerCase();
    const domainUser = rawDomain.replace(/^corp\\/i, '');
    const emailPrefix = (user.email || '').split('@')[0].trim().toLowerCase();

    const creatorIds = [rawDomain, domainUser, `corp\\${domainUser}`, emailPrefix, userAccName].filter(Boolean);
    if (dealCreatedBy && creatorIds.some((id) => dealCreatedBy === id || dealCreatedBy.includes(id))) {
      return true;
    }

    return false;
  }

  return false;
}

