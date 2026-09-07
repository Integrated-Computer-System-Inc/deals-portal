import { UserRole } from '@my-app/types';
import { normalizeBusinessUnit } from './searchUtils';
import { getBrandVariations } from './brandUtils';

/**
 * Interface representing resolved role and access scope for an account
 */
export interface ResolvedUserAccess {
  role: UserRole | null;
  assignedBUs: string[];
  assignedBrands?: string[];
  roleTitle: string;
  isAuthorized: boolean;
  isITAdmin: boolean;
  isAdmin: boolean;
  isPM: boolean;
  isBuHead: boolean;
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
export interface ImpersonationPersona {
  accountId: number;
  name: string;
  email: string;
  domainAccount: string;
  role: UserRole;
  assignedBUs: string[];
  assignedBrands?: string[];
  roleTitle: string;
  category: 'ADMIN' | 'BU_HEAD' | 'ACCOUNT_OFFICER' | 'PM';
  GAvatar?: string | null;
  dealCountDescription?: string;
}

/**
 * Explicit list of authorized Superadmins who can access the Impersonation tool
 */
export const SUPERADMIN_EMAILS: readonly string[] = [
  'jdoremon@ics.com.ph',
  'bcandelaria@ics.com.ph',
  'mescario@ics.com.ph',
  'dramos@ics.com.ph',
];

export function isSuperadminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const envAdmins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return (
    SUPERADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === normalized) ||
    envAdmins.includes(normalized)
  );
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
 * 1. Explicit ITadmin role / Superadmin email / IT Admin AccountID → IT Administrator
 * 2. Explicit 'admin' role from Users table → Sales Administrator
 * 3. Explicit 'pm' role + AssignedBrand column → Product Manager
 * 4. Any other explicit role from Users table + AssignedBU column → that role with BU scope
 * 5. Fallback: validate cdbAccounts (AO / PMD allowed; IT Support rejected)
 *
 * @param accountId   Numeric or string AccountID from Users or cdbAccounts
 * @param email       Optional email for developer/admin override checks
 * @param accountGroupFallback  Fallback BU/group from cdbAccounts.AccountGroup
 * @param accountType AccountType from cdbAccounts (e.g. 'AO', 'PM', 'SUPPORT')
 * @param isActive    Active flag from cdbAccounts (1 = active)
 * @param explicitRole Clean role enum stored in Users.UserRole (e.g. 'bu', 'pm', 'admin', 'ao')
 *                     Also accepts legacy composite strings like 'bu:BU1,BU2' for backward compat.
 * @param explicitBU   Comma-separated BU string from Users.AssignedBU (e.g. 'BU8,BU12,CE01')
 * @param explicitBrand Comma-separated brand string from Users.AssignedBrand (e.g. 'DELL,HPI')
 */
export function resolveUserRoleAndBUs(
  accountId: number | string,
  email?: string | null,
  accountGroupFallback?: string | null,
  accountType?: string | null,
  isActive?: number | null,
  explicitRole?: UserRole | string | null,
  explicitBU?: string | string[] | null,
  explicitBrand?: string | string[] | null
): ResolvedUserAccess {
  const numericId = typeof accountId === 'string' ? parseInt(accountId.replace(/\D/g, ''), 10) : accountId;

  // Parse the role — support both clean enum ('bu') and legacy composite ('bu:BU1,BU2')
  let parsedRole: UserRole | null = null;
  let legacyBUs: string[] | null = null;
  let legacyBrands: string[] | null = null;

  if (explicitRole) {
    if (explicitRole.includes(':')) {
      // Legacy composite format — migration hasn't run yet for this row
      const colonIdx = explicitRole.indexOf(':');
      const r = explicitRole.slice(0, colonIdx).trim() as UserRole;
      const items = explicitRole.slice(colonIdx + 1).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
      parsedRole = r;
      if (r === 'pm') {
        legacyBrands = items;
      } else {
        legacyBUs = items;
      }
    } else {
      parsedRole = explicitRole as UserRole;
    }
  }

  // Resolve BUs: prefer dedicated column, fall back to legacy parsed, then accountGroupFallback
  const resolveBUs = (): string[] => {
    if (explicitBU) {
      return Array.isArray(explicitBU)
        ? explicitBU.map((b) => b.trim().toUpperCase()).filter(Boolean)
        : explicitBU.split(',').map((b) => b.trim().toUpperCase()).filter(Boolean);
    }
    if (legacyBUs && legacyBUs.length > 0) return legacyBUs;
    if (accountGroupFallback && accountGroupFallback.trim()) {
      return accountGroupFallback.split(',').map((b) => b.trim().toUpperCase()).filter(Boolean);
    }
    return [];
  };

  // Resolve Brands: prefer dedicated column, fall back to legacy parsed
  const resolveBrands = (): string[] => {
    if (explicitBrand) {
      return Array.isArray(explicitBrand)
        ? explicitBrand.map((b) => b.trim().toUpperCase()).filter(Boolean)
        : explicitBrand.split(',').map((b) => b.trim().toUpperCase()).filter(Boolean);
    }
    if (legacyBrands && legacyBrands.length > 0) return legacyBrands;
    return [];
  };

  // 1. ITadmin check
  if (
    parsedRole === 'ITadmin' ||
    isSuperadminEmail(email) ||
    [57845, 57846, 57732, 56395].includes(numericId)
  ) {
    return {
      role: 'ITadmin',
      assignedBUs: ['ALL'],
      assignedBrands: ['ALL'],
      roleTitle: 'IT Administrator',
      isAuthorized: true,
      isITAdmin: true,
      isAdmin: true,
      isPM: false,
      isBuHead: false,
      isAdminAssistant: false,
      isAccountOfficer: false,
    };
  }

  // 2. Sales Admin
  if (parsedRole === 'admin') {
    return {
      role: 'admin',
      assignedBUs: ['ALL'],
      assignedBrands: ['ALL'],
      roleTitle: 'Sales Administrator',
      isAuthorized: true,
      isITAdmin: false,
      isAdmin: true,
      isPM: false,
      isBuHead: false,
      isAdminAssistant: false,
      isAccountOfficer: false,
    };
  }

  // 3. Product Manager
  if (parsedRole === 'pm') {
    return {
      role: 'pm',
      assignedBUs: [],
      assignedBrands: resolveBrands(),
      roleTitle: 'Product Manager',
      isAuthorized: true,
      isITAdmin: false,
      isAdmin: false,
      isPM: true,
      isBuHead: false,
      isAdminAssistant: false,
      isAccountOfficer: false,
    };
  }

  // 4. Any other explicit role from Users table (bu, ao, aa, bu_admin)
  if (parsedRole) {
    const assignedBUs = resolveBUs();
    return {
      role: parsedRole,
      assignedBUs,
      assignedBrands: resolveBrands(),
      roleTitle:
        parsedRole === 'bu'
          ? assignedBUs.length > 0 ? `${assignedBUs.join(' / ')} Head` : 'BU Head'
          : parsedRole === 'aa'
          ? 'Admin Assistant'
          : 'Account Officer',
      isAuthorized: true,
      isITAdmin: false,
      isAdmin: false,
      isPM: false,
      isBuHead: parsedRole === 'bu' || parsedRole === ('bu_admin' as UserRole),
      isAdminAssistant: parsedRole === 'aa',
      isAccountOfficer: parsedRole === 'ao',
    };
  }

  // 6. Fallback: Validate against cdbAccounts
  const normalizedType = (accountType || '').trim().toUpperCase();
  const normalizedGroup = (accountGroupFallback || '').trim().toUpperCase();
  const isActiveAccount = isActive === 1;

  // Block unauthorized IT support accounts that are not in the registry/Users table
  if (normalizedGroup === 'IT' && normalizedType === 'SUPPORT') {
    return {
      role: null,
      assignedBUs: [],
      assignedBrands: [],
      roleTitle: 'Unauthorized IT Account',
      isAuthorized: false,
      isITAdmin: false,
      isAdmin: false,
      isPM: false,
      isBuHead: false,
      isAdminAssistant: false,
      isAccountOfficer: false,
      rejectionReason: 'Account is not configured as an authorized IT Administrator. Access denied.',
    };
  }

  // Match PM accounts (AccountGroup = 'PMD', AccountType = 'PM')
  if (normalizedGroup === 'PMD' && normalizedType.startsWith('PM') && isActiveAccount) {
    return {
      role: 'pm',
      assignedBUs: [],
      assignedBrands: [],
      roleTitle: 'Product Manager',
      isAuthorized: true,
      isITAdmin: false,
      isAdmin: false,
      isPM: true,
      isBuHead: false,
      isAdminAssistant: false,
      isAccountOfficer: false,
    };
  }

  // Match AO accounts (AccountType = 'AO')
  if (normalizedType === 'AO' && isActiveAccount) {
    const fallbackBUs = accountGroupFallback && accountGroupFallback.trim()
      ? accountGroupFallback.split(',').map((b) => b.trim().toUpperCase()).filter(Boolean)
      : [];
    return {
      role: 'ao',
      assignedBUs: fallbackBUs,
      assignedBrands: [],
      roleTitle: 'Account Officer',
      isAuthorized: true,
      isITAdmin: false,
      isAdmin: false,
      isPM: false,
      isBuHead: false,
      isAdminAssistant: false,
      isAccountOfficer: true,
    };
  }

  // If not matching authorized pattern, reject
  const reason =
    !normalizedType.startsWith('AO') && !normalizedType.startsWith('PM')
      ? `AccountType '${accountType || 'UNKNOWN'}' is not authorized for portal access. Only AO, BU Heads, PMs, and Administrators are permitted.`
      : `Account is inactive (isActive = ${isActive}). Please contact IT Support.`;

  return {
    role: null,
    assignedBUs: [],
    assignedBrands: [],
    roleTitle: 'Unauthorized User',
    isAuthorized: false,
    isITAdmin: false,
    isAdmin: false,
    isPM: false,
    isBuHead: false,
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
  const resolved = resolveUserRoleAndBUs(numericId);
  return resolved.role === 'bu' || resolved.role === 'bu_admin';
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
 * Builds Prisma OR conditions for a Product Manager (PM).
 * Matches any assigned brands with exact match and all canonical/variations.
 */
export function buildPMScopingConditions(assignedBrands?: string[] | string | null): any[] {
  const brandList = Array.isArray(assignedBrands)
    ? assignedBrands
    : (assignedBrands || '').split(',').map((b) => b.trim()).filter(Boolean);

  if (brandList.length === 0) {
    return [{ dealID: -1 }]; // No brands assigned -> empty scoping
  }

  const allVariations = Array.from(
    new Set(brandList.flatMap((b) => getBrandVariations(String(b))))
  );

  return [
    {
      OR: [
        { brand: { in: allVariations } },
        ...brandList.map((b) => ({ brand: { contains: String(b).trim() } })),
      ],
    },
  ];
}

/**
 * Validates if an individual deal is accessible to a user based on their role and claims.
 */
export function isDealAccessibleByUser(
  deal: { AssignedAO?: string | null; createdBy?: string | null; BU?: string | null; brand?: string | null } | null | undefined,
  user: {
    role?: UserRole | string | null;
    accountName?: string | null;
    domainAccount?: string | null;
    email?: string | null;
    assignedBUs?: string[] | null;
    assignedBrands?: string[] | null;
  }
): boolean {
  if (!deal) return false;
  const role = user.role || 'ao';
  if (role === 'ITadmin' || role === 'admin' || role === 'aa') {
    return true;
  }

  if (role === 'pm') {
    const userBrands = (user.assignedBrands || []).map((b) => b.trim().toUpperCase());
    if (userBrands.length === 0) return false;
    const dealBrand = (deal.brand || '').trim().toUpperCase();
    if (!dealBrand) return false;
    return userBrands.some((ub) => {
      const vars = getBrandVariations(ub).map((v) => v.toUpperCase());
      return vars.includes(dealBrand) || dealBrand.includes(ub) || ub.includes(dealBrand);
    });
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

