import Link from 'next/link';
import { Button } from '@aaronisms/ui/button';
import { signOut } from '../actions';

export function AdminNav() {
  return (
    <nav aria-label="Admin" className="flex items-center gap-4 text-sm">
      <Link href="/admin" className="underline-offset-4 hover:underline">
        Queue
      </Link>
      <Link href="/admin/entries" className="underline-offset-4 hover:underline">
        Entries
      </Link>
      <Link href="/admin/speakers" className="underline-offset-4 hover:underline">
        Speakers
      </Link>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm">
          Sign out
        </Button>
      </form>
    </nav>
  );
}
