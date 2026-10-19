import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import type { Database } from '../src/database.types';

const url = process.env.SUPABASE_URL ?? '';
const anonKey = process.env.SUPABASE_ANON_KEY ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const options = { auth: { persistSession: false } };

describe('auth', () => {
  const anon = createClient<Database>(url, anonKey, options);
  const admin = createClient<Database>(url, serviceKey, options);

  it('rejects open signup, so nobody can claim the admin email', async () => {
    const email = `signup-${crypto.randomUUID().slice(0, 8)}@example.com`;
    const response = await fetch(`${url}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: anonKey, 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: crypto.randomUUID() }),
    });
    expect(response.ok).toBe(false);
    expect(await response.json()).toMatchObject({ error_code: 'signup_disabled' });
  });

  it('creates no user from a magic-link request', async () => {
    const email = `otp-${crypto.randomUUID().slice(0, 8)}@example.com`;
    await anon.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    expect(data.users.some((user) => user.email === email)).toBe(false);
  });

  it('marks a magic-link session as otp and a password session as password', async () => {
    const email = `amr-${crypto.randomUUID().slice(0, 8)}@example.com`;
    const password = crypto.randomUUID();
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(created.error).toBeNull();
    try {
      const methods = async (session: { access_token: string } | null) =>
        (
          (
            await createClient<Database>(url, anonKey, options).auth.getClaims(
              session?.access_token,
            )
          ).data?.claims.amr ?? []
        ).map((entry) => (typeof entry === 'string' ? entry : entry.method));

      const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
      const verified = await createClient<Database>(url, anonKey, options).auth.verifyOtp({
        token_hash: link.data.properties?.hashed_token ?? '',
        type: 'magiclink',
      });
      expect(await methods(verified.data.session)).toEqual(['otp']);

      const signedIn = await createClient<Database>(url, anonKey, options).auth.signInWithPassword({
        email,
        password,
      });
      expect(signedIn.error).toBeNull();
      expect(await methods(signedIn.data.session)).toEqual(['password']);
    } finally {
      await admin.auth.admin.deleteUser(created.data.user?.id ?? '');
    }
  });
});
