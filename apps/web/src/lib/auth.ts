import 'server-only';
import { redirect } from 'next/navigation';
import { getServerEnv } from '@/lib/env';
import { createSessionClient } from '@/lib/supabase/session';

export type AdminUser = { email: string };

/**
 * The signed-in admin: the default moderator (the first address in MODERATOR_EMAILS) after a
 * magic-link sign-in. Anyone else is sent back to the login page. Call it at the top of every
 * admin page and Server Action.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) redirect('/admin/login');
  if (email !== getServerEnv().defaultModerator) redirect('/admin/login?error=forbidden');
  return { email };
}
