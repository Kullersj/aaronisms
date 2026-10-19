import { Button } from '@aaronisms/ui/button';
import { deleteEntry } from '../actions';

/**
 * Deletes an entry once the admin opens the warning and confirms. A plain POST form inside a
 * `<details>`, like the reject box, so it works before (or without) JavaScript.
 */
export function DeleteEntryButton({ entryId }: { entryId: string }) {
  return (
    <details className="border-border rounded-md border p-3">
      <summary className="cursor-pointer text-sm font-medium">Delete entry…</summary>
      <form action={deleteEntry} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="entryId" value={entryId} />
        <p className="text-muted-foreground text-sm">
          It comes off the site and its lines and photo are deleted. This cannot be undone. To hide
          it but keep a copy, reject it instead.
        </p>
        <Button type="submit" className="self-start">
          Delete for good
        </Button>
      </form>
    </details>
  );
}
