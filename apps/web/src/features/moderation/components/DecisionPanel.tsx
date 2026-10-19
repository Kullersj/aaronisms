import Link from 'next/link';
import { Button, buttonVariants } from '@aaronisms/ui/button';
import { cn } from '@aaronisms/ui/lib/utils';
import { Textarea } from '@aaronisms/ui/textarea';

export type DecisionPanelProps = {
  /** The hidden field that tells the action what is being decided: a token or an entry id. */
  target: { name: 'token' | 'entryId'; value: string };
  approve: (formData: FormData) => Promise<void>;
  reject: (formData: FormData) => Promise<void>;
  editHref: string;
  /** The email button that was clicked: approve gets focus, reject opens its reason box. */
  highlight?: 'approve' | 'reject';
};

/** Approve, reject (with an optional reason) and edit. Each button is a POST to a Server Action. */
export function DecisionPanel({
  target,
  approve,
  reject,
  editHref,
  highlight,
}: DecisionPanelProps) {
  const hidden = <input type="hidden" name={target.name} value={target.value} />;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <form action={approve}>
          {hidden}
          <Button type="submit" autoFocus={highlight === 'approve'}>
            Approve
          </Button>
        </form>
        <Link href={editHref} className={cn(buttonVariants({ variant: 'outline' }))}>
          Edit before approving
        </Link>
      </div>
      <details open={highlight === 'reject'} className="border-border rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">Reject…</summary>
        <form action={reject} className="mt-3 flex flex-col gap-2">
          {hidden}
          <Textarea
            name="note"
            rows={2}
            maxLength={500}
            aria-label="Reason (optional)"
            placeholder="Reason (optional)"
          />
          <Button type="submit" variant="secondary" className="self-start">
            Reject
          </Button>
        </form>
      </details>
    </div>
  );
}
