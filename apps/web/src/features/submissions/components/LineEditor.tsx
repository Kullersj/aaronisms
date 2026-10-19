'use client';

import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import type { NewSubmissionInput } from '@aaronisms/db/schemas';
import { Button } from '@aaronisms/ui/button';
import { Select } from '@aaronisms/ui/select';
import { Textarea } from '@aaronisms/ui/textarea';
import { FieldError } from './FieldError';
import { SpeakerCombobox } from './SpeakerCombobox';

/** The part of a form's values the editor reads and writes. Any form with `lines` can host it. */
export type LineEditorValues = Pick<NewSubmissionInput, 'lines'>;

export type LineEditorProps = {
  speakers: string[];
};

/** Rows of spoken lines and stage directions. Render it inside a react-hook-form `FormProvider`. */
export function LineEditor({ speakers }: LineEditorProps) {
  const {
    control,
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<LineEditorValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {fields.map((field, index) => {
          const rowErrors = errors.lines?.[index];
          const isStage = watch(`lines.${index}.kind`) === 'stage';
          return (
            <li
              key={field.id}
              className="border-border flex min-w-0 flex-col gap-2 rounded-md border p-3"
            >
              <div className="flex items-center gap-2">
                <Select
                  aria-label={`Type of line ${index + 1}`}
                  className="w-auto shrink-0"
                  {...register(`lines.${index}.kind`, {
                    onChange: (event) => {
                      if (event.target.value === 'stage') setValue(`lines.${index}.speaker`, null);
                      else setValue(`lines.${index}.speaker`, '');
                    },
                  })}
                >
                  <option value="line">Line</option>
                  <option value="stage">Stage direction</option>
                </Select>
                {isStage ? null : (
                  <Controller
                    control={control}
                    name={`lines.${index}.speaker`}
                    render={({ field: speaker }) => (
                      <SpeakerCombobox
                        value={speaker.value ?? ''}
                        onChange={speaker.onChange}
                        speakers={speakers}
                        label={`Speaker for line ${index + 1}`}
                        invalid={Boolean(rowErrors?.speaker)}
                      />
                    )}
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto w-9 shrink-0 px-0"
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                  aria-label={`Remove line ${index + 1}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
              <Textarea
                rows={2}
                aria-label={
                  isStage ? `Stage direction ${index + 1}` : `What they said, line ${index + 1}`
                }
                placeholder={isStage ? 'Everyone nods slowly.' : 'What they said'}
                aria-invalid={Boolean(rowErrors?.text) || undefined}
                {...register(`lines.${index}.text`)}
              />
              <FieldError message={rowErrors?.speaker?.message} />
              <FieldError message={rowErrors?.text?.message} />
            </li>
          );
        })}
      </ol>
      <FieldError message={errors.lines?.root?.message ?? errors.lines?.message} />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ kind: 'line', speaker: '', text: '' })}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add line
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ kind: 'stage', speaker: null, text: '' })}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add stage direction
        </Button>
      </div>
    </div>
  );
}
