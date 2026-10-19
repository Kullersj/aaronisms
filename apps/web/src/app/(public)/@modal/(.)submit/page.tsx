import { SubmitDialog } from '@/components/layout/SubmitDialog';
import { SubmitFormLoader } from '@/features/submissions/components/SubmitFormLoader';

// Needs Supabase and the server environment at request time, never at build time.
export const dynamic = 'force-dynamic';

// Intercepts client-side visits to /submit; a direct visit gets the full page instead.
export default function SubmitModal() {
  return (
    <SubmitDialog>
      <SubmitFormLoader inDialog />
    </SubmitDialog>
  );
}
