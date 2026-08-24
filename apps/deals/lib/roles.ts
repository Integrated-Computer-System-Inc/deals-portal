import { UserRole } from '@my-app/types';

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
    role: 'bu',
    assignedBUs: ['BU1'],
    roleTitle: 'BU1 Head',
  },
  205: {
    accountId: 205,
    name: 'ROSETTE DE GUZMAN',
    email: 'rdeguzman@ics.com.ph',
    role: 'bu',
    assignedBUs: ['BU2'],
    roleTitle: 'BU2 Head',
  },
  856: {
    accountId: 856,
    name: 'FLORDELIZA RICAFLANCA',
    email: 'fricaflanca@ics.com.ph',
    role: 'bu',
    assignedBUs: ['BU5'],
    roleTitle: 'BU5 Head',
  },
  387: {
    accountId: 387,
    name: 'SHIELA MARIE PEÑALOSA-MARCELO',
    email: 'smpenalosa@ics.com.ph',
    role: 'bu',
    assignedBUs: ['BU8', 'BU12', 'CE01'],
    roleTitle: 'BU8 / BU12 / CE01 Head',
  },
  310: {
    accountId: 310,
    name: 'PATRICIA LORIA',
    email: 'ploria@ics.com.ph',
    role: 'bu',
    assignedBUs: ['BU10'],
    roleTitle: 'BU10 Head',
  },

  // Admin Assistant
  57835: {
    accountId: 57835,
    name: 'ATHENA BEATRICE FRANCISCO',
    email: 'AFRANCISCO@ICS.COM.PH',
    role: 'aa',
    assignedBUs: [],
    roleTitle: 'Admin Assistant',
  },

  // Admin
  415: {
    accountId: 415,
    name: 'ADELIANA SY-LU',
    email: 'asy-lu@ics.com.ph',
    role: 'admin',
    assignedBUs: [],
    roleTitle: 'Administrator',
  },
};

/**
 * Helper to normalize and check if an email is configured in ADMIN_EMAILS environment variable
 */
export function isConfiguredAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || 'jdoremon@ics.com.ph,bcandelaria@ics.com.ph')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.trim().toLowerCase());
}

/**
 * Resolves the role, assigned business units, and authorization status for an account.
 *
 * Authorization logic:
 * 1. ADMIN_EMAILS list -> Admin
 * 2. Explicit AccountID registry (BU Heads, Admin Assistant, Admin) -> Configured role
 * 3. All other accounts:
 *    - MUST have AccountType === 'AO' (case-insensitive)
 *    - MUST have isActive === 1
 *    - If both match -> Account Officer ('ao')
 *    - Otherwise -> Rejected (isAuthorized: false)
 *
 * @param accountId Numeric or string AccountID from cdbAccounts
 * @param email Optional email for developer/admin override checks
 * @param accountGroupFallback Optional fallback BU/group from cdbAccounts.AccountGroup
 * @param accountType Optional AccountType from cdbAccounts.AccountType (e.g. 'AO', 'USER', 'CUSTOMER')
 * @param isActive Optional active flag from cdbAccounts.isActive (1 = active, 0 = inactive)
 */
export function resolveUserRoleAndBUs(
  accountId: number | string,
  email?: string | null,
  accountGroupFallback?: string | null,
  accountType?: string | null,
  isActive?: number | null
): ResolvedUserAccess {
  const numericId = typeof accountId === 'string' ? parseInt(accountId.replace(/\D/g, ''), 10) : accountId;
  const config = !isNaN(numericId) ? ACCOUNT_ROLE_REGISTRY[numericId] : undefined;

  // 1. Check if email is in ADMIN_EMAILS environment override
  if (isConfiguredAdminEmail(email)) {
    return {
      role: 'admin',
      assignedBUs: config?.assignedBUs || [],
      roleTitle: 'Administrator (IT Superadmin)',
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

  // 3. Fallback: Validate if account is tagged as an active 'AO'
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
