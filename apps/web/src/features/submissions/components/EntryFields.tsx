'use client';

import { useFormContext } from 'react-hook-form';
import type { NewSubmissionInput } from '@aaronisms/db/schemas';
import { Input } from '@aaronisms/ui/input';
import { Label } from '@aaronisms/ui/label';
import { FieldError } from './FieldError';
import { LineEditor, type LineEditorValues } from './LineEditor';

/** The values of the fields shared by submitting and editing: date, setup line and lines. */
export type EntryFieldsValues = LineEditorValues & {
  saidOn?: NewSubmissionInput['saidOn'] | null;
  context?: NewSubmissionInput['context'];
};

export type EntryFieldsProps = {
  speakers: string[];
  /** Hide the date for undated College Years entries. */
  showDate?: boolean;
};

/** Date, setup line and line editor. Render it inside a react-hook-form `FormProvider`. */
export function EntryFields({ speakers, showDate = true }: EntryFieldsProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<EntryFieldsValues>();

  return (
    <>
      {showDate ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="saidOn">When was it said?</Label>
          <Input id="saidOn" type="date" className="sm:w-auto" {...register('saidOn')} />
          <FieldError message={errors.saidOn?.message} />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="context">Setup (optional)</Label>
        <Input
          id="context"
          placeholder="During the Fantasy Football draft:"
          {...register('context')}
        />
        <FieldError message={errors.context?.message} />
      </div>

      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">What was said</legend>
        <LineEditor speakers={speakers} />
      </fieldset>
    </>
  );
}
