import type { Metadata } from 'next';
import { PageShell } from '@/components/layout/PageShell';
import { LoginForm } from '@/features/admin/components/LoginForm';

export const metadata: Metadata = { title: 'Admin sign in' };

type PageProps = { searchParams: Promise<{ error?: string }> };

const ERRORS: Record<string, string> = {
  forbidden: 'That account is not allowed to use the admin.',
  link: 'That sign-in link did not work. Request a new one.',
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const { error } = await searchParams;
  return (
    <PageShell title="Admin sign in">
      <p className="text-muted-foreground mb-4">
        Day-to-day moderation happens from the emails. This is the fallback.
      </p>
      <LoginForm error={error && Object.hasOwn(ERRORS, error) ? ERRORS[error] : undefined} />
    </PageShell>
  );
}
