'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isConfiguredAdminEmail, getImpersonationPersona, IMPERSONATION_PERSONAS, ImpersonationPersona } from '@/lib/roles';
import { serverCache } from '@/lib/serverCache';
import { revalidatePath } from 'next/cache';

/**
 * Validates if the current session belongs to an authorized Superadmin
 * (either directly or via an active impersonation session).
 */
export async function isAuthorizedImpersonator(): Promise<{
  authorized: boolean;
  adminEmail: string | null;
  currentRole: string | null;
  isImpersonating: boolean;
}> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { authorized: false, adminEmail: null, currentRole: null, isImpersonating: false };
  }

  const sessionEmail = session.user.email || '';
  const originalAdminEmail = (session.user as any)?.originalAdminEmail || null;
  const isImpersonating = Boolean((session.user as any)?.isImpersonating);
  const currentRole = ((session.user as any)?.role as string) || null;

  // Check if direct email or original admin email is in ADMIN_EMAILS
  const authorized = isConfiguredAdminEmail(sessionEmail) || isConfiguredAdminEmail(originalAdminEmail);

  return {
    authorized,
    adminEmail: originalAdminEmail || (isConfiguredAdminEmail(sessionEmail) ? sessionEmail : null),
    currentRole,
    isImpersonating,
  };
}

/**
 * Returns the list of available personas if the caller is authorized.
 */
export async function getAvailablePersonas(): Promise<{
  success: boolean;
  data?: ImpersonationPersona[];
  error?: string;
}> {
  const auth = await isAuthorizedImpersonator();
  if (!auth.authorized) {
    return { success: false, error: 'Unauthorized: Impersonator mode requires Superadmin privileges.' };
  }

  return { success: true, data: IMPERSONATION_PERSONAS };
}

/**
 * Prepares the target persona payload for in-place session updating.
 * Clears server cache and triggers revalidation.
 */
export async function switchImpersonationTarget(targetAccountId: number | null): Promise<{
  success: boolean;
  target: ImpersonationPersona | null;
  error?: string;
}> {
  const auth = await isAuthorizedImpersonator();
  if (!auth.authorized) {
    return { success: false, target: null, error: 'Unauthorized: Only Superadmins can switch personas.' };
  }

  // Clear memory cache for deals so the newly switched user gets fresh scoped data
  serverCache.clear();

  if (targetAccountId === null) {
    // Exit impersonation
    revalidatePath('/deals');
    revalidatePath('/dashboard');
    revalidatePath('/reports');
    return { success: true, target: null };
  }

  const target = getImpersonationPersona(targetAccountId);
  if (!target) {
    return { success: false, target: null, error: `Persona with AccountID ${targetAccountId} not found.` };
  }

  revalidatePath('/deals');
  revalidatePath('/dashboard');
  revalidatePath('/reports');

  return { success: true, target };
}
