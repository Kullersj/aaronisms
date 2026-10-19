'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@aaronisms/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@aaronisms/ui/dialog';
import { deleteEntry } from '../actions';

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Deleting…' : 'Delete for good'}
    </Button>
  );
}

/** Deletes an entry after the admin confirms in a dialog, since the delete cannot be undone. */
export function DeleteEntryButton({ entryId }: { entryId: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Delete entry…
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogTitle>Delete this entry?</DialogTitle>
        <DialogDescription>
          It comes off the site and its lines and photo are deleted. This cannot be undone. To hide
          it but keep a copy, reject it instead.
        </DialogDescription>
        <form action={deleteEntry} className="flex flex-wrap justify-end gap-2">
          <input type="hidden" name="entryId" value={entryId} />
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <ConfirmButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
