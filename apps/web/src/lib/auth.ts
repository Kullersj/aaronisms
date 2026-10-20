import 'server-only';
import { redirect } from 'next/navigation';
import { getServerEnv } from '@/lib/env';
import { createSessionClient } from '@/lib/supabase/session';

export type AdminUser = { email: string };

/** Sign-in methods (JWT `amr`) that prove control of the inbox; a password session does not. */
const INBOX_METHODS = new Set(['otp', 'magiclink']);

/**
 * Whether the current session began with an emailed magic link. Sign-up is off, but this keeps a
 * password session for a moderator's address (if one ever existed) from passing as the admin.
 */
export async function isMagicLinkSession(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
): Promise<boolean> {
  const { data } = await supabase.auth.getClaims();
  return (data?.claims.amr ?? []).some((entry) =>
    INBOX_METHODS.has(typeof entry === 'string' ? entry : entry.method),
  );
}

/**
 * The signed-in admin: any moderator (an address in MODERATOR_EMAILS) after a magic-link
 * sign-in. Anyone else is sent back to the login page. Call it at the top of every
 * admin page and Server Action.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) redirect('/admin/login');
  if (!getServerEnv().isModerator(email) || !(await isMagicLinkSession(supabase))) {
    redirect('/admin/login?error=forbidden');
  }
  return { email };
}
