'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { entryEditSchema, type EntryEdit } from '@aaronisms/db/schemas';
import { Button } from '@aaronisms/ui/button';
import { EntryFields } from '@/features/submissions/components/EntryFields';
import { FieldError } from '@/features/submissions/components/FieldError';
import { approveWithEdits } from '../actions';

export type EditAndApproveFormProps = {
  token: string;
  initial: EntryEdit;
  speakers: string[];
};

/** Fix typos, speakers or the date, then approve in one step. The token authorises this entry. */
export function EditAndApproveForm({ token, initial, speakers }: EditAndApproveFormProps) {
  const form = useForm({ resolver: zodResolver(entryEditSchema), defaultValues: initial });
  const [error, setError] = useState<string>();

  async function onSubmit(edit: EntryEdit) {
    setError(undefined);
    // On success the action redirects back to this page, which then shows the decision.
    const result = await approveWithEdits(token, edit);
    if (!result.ok) setError(result.message);
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <EntryFields speakers={speakers} showDate={initial.saidOn !== null} />
        <FieldError message={error} />
        <Button type="submit" disabled={form.formState.isSubmitting} className="self-start">
          {form.formState.isSubmitting ? 'Saving…' : 'Save and approve'}
        </Button>
      </form>
    </FormProvider>
  );
}
