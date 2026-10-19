'use client';

import { useState, type BaseSyntheticEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Turnstile } from '@marsidev/react-turnstile';
import { toast } from 'sonner';
import {
  HONEYPOT_FIELD,
  IMAGE_TYPES,
  newSubmissionSchema,
  type NewSubmission,
  type NewSubmissionInput,
} from '@aaronisms/db/schemas';
import { Button } from '@aaronisms/ui/button';
import { Input } from '@aaronisms/ui/input';
import { Label } from '@aaronisms/ui/label';
import { submitEntry } from '../actions';
import { EntryFields } from './EntryFields';
import { FieldError } from './FieldError';

export type SubmitFormProps = {
  speakers: string[];
  turnstileSiteKey: string;
  /** Shown in a dialog: confirm in place of the form once sent, rather than with a toast. */
  inDialog?: boolean;
};

const THANKS = "Thanks, it's been sent for review.";

/** Today's date in the visitor's own time zone, as YYYY-MM-DD. */
function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

const emptyForm = (): NewSubmissionInput => ({
  saidOn: localToday(),
  context: '',
  lines: [{ kind: 'line', speaker: '', text: '' }],
  submittedBy: '',
});

export function SubmitForm({ speakers, turnstileSiteKey, inDialog = false }: SubmitFormProps) {
  const router = useRouter();
  const form = useForm<NewSubmissionInput, unknown, NewSubmission>({
    resolver: zodResolver(newSubmissionSchema),
    defaultValues: emptyForm(),
  });
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = form;
  const [captcha, setCaptcha] = useState('');
  const [serverError, setServerError] = useState<string>();
  const [sent, setSent] = useState(false);
  // Bumping the key remounts the widget, which fetches a fresh single-use token.
  const [captchaKey, setCaptchaKey] = useState(0);
  // Likewise for the file input, which has no other way to be emptied.
  const [fileKey, setFileKey] = useState(0);

  async function onSubmit({ image, ...fields }: NewSubmission, event?: BaseSyntheticEvent) {
    setServerError(undefined);
    const data = new FormData();
    data.set('payload', JSON.stringify(fields));
    if (image) data.set('image', image);
    data.set(HONEYPOT_FIELD, new FormData(event?.target).get(HONEYPOT_FIELD) ?? '');
    data.set('turnstileToken', captcha);

    try {
      const result = await submitEntry(data);
      if (result.ok) {
        if (inDialog) setSent(true);
        else toast.success(THANKS);
        reset(emptyForm());
        setFileKey((key) => key + 1);
      } else {
        setServerError(result.message);
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      // A Turnstile token works once, so get a fresh one whatever happened.
      setCaptcha('');
      setCaptchaKey((key) => key + 1);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="status">{THANKS}</p>
        <Button type="button" onClick={() => router.back()}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative flex flex-col gap-6">
        <EntryFields speakers={speakers} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="image">Photo (optional)</Label>
          <Input
            id="image"
            key={fileKey}
            type="file"
            accept={IMAGE_TYPES.join(',')}
            className="h-auto py-2"
            onChange={(event) =>
              setValue('image', event.target.files?.[0], { shouldValidate: true })
            }
          />
          <FieldError message={errors.image?.message} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="submittedBy">Your name (optional)</Label>
          <Input id="submittedBy" autoComplete="name" {...register('submittedBy')} />
          <FieldError message={errors.submittedBy?.message} />
        </div>

        {/* Honeypot: invisible to people, tempting to bots. */}
        <div aria-hidden="true" className="absolute top-0 -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Leave blank
            <input name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <Turnstile
          key={captchaKey}
          siteKey={turnstileSiteKey}
          onSuccess={setCaptcha}
          onExpire={() => setCaptcha('')}
          options={{ theme: 'auto' }}
        />

        <FieldError message={serverError} />
        <Button type="submit" size="lg" disabled={isSubmitting} className="self-start">
          {isSubmitting ? 'Sending…' : 'Submit for review'}
        </Button>
      </form>
    </FormProvider>
  );
}
