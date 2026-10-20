'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  IMAGE_TYPES,
  entryEditSchema,
  type EntryEdit,
  type EntryStatus,
} from '@aaronisms/db/schemas';
import { Button } from '@aaronisms/ui/button';
import { Input } from '@aaronisms/ui/input';
import { Label } from '@aaronisms/ui/label';
import { Select } from '@aaronisms/ui/select';
import { EntryFields } from '@/features/submissions/components/EntryFields';
import { saveEntry } from '../actions';

export type AdminEntryFormProps = {
  entryId: string;
  initial: EntryEdit;
  status: EntryStatus;
  imageUrl: string | null;
  imageAlt: string | null;
  speakers: string[];
};

type Intent = 'save' | 'approve';

export function AdminEntryForm({
  entryId,
  initial,
  status,
  imageUrl,
  imageAlt,
  speakers,
}: AdminEntryFormProps) {
  const router = useRouter();
  const form = useForm({ resolver: zodResolver(entryEditSchema), defaultValues: initial });
  const [newStatus, setNewStatus] = useState(status);
  const [alt, setAlt] = useState(imageAlt ?? '');
  const [photo, setPhoto] = useState<File>();
  const [removeImage, setRemoveImage] = useState(false);
  const pending = status === 'pending';

  async function submit(edit: EntryEdit, intent: Intent) {
    const data = new FormData();
    data.set(
      'payload',
      JSON.stringify({ edit, status: newStatus, imageAlt: alt, removeImage, intent }),
    );
    if (photo) data.set('image', photo);
    const result = await saveEntry(entryId, data);
    if (!result.ok) return toast.error(result.message);
    toast.success(intent === 'approve' ? 'Saved and approved.' : 'Saved.');
    // The refreshed entry is published now; without this the status select would still say
    // pending, and the next Save would take the entry down again.
    if (intent === 'approve') setNewStatus('published');
    router.refresh();
  }

  const { handleSubmit, formState } = form;
  return (
    <FormProvider {...form}>
      <form
        onSubmit={handleSubmit((edit) => submit(edit, 'save'))}
        noValidate
        className="flex flex-col gap-6"
      >
        <EntryFields speakers={speakers} showDate={initial.saidOn !== null} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="image">Photo</Label>
          {imageUrl && !removeImage ? (
            <Image
              src={imageUrl}
              alt={alt}
              width={600}
              height={450}
              className="border-border h-auto w-full max-w-sm rounded-md border"
            />
          ) : null}
          <Input
            id="image"
            type="file"
            accept={IMAGE_TYPES.join(',')}
            className="h-auto py-2"
            onChange={(event) => setPhoto(event.target.files?.[0])}
          />
          {imageUrl ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={removeImage}
                onChange={(event) => setRemoveImage(event.target.checked)}
              />
              Remove the current photo
            </label>
          ) : null}
          <Label htmlFor="imageAlt">Photo description (alt text)</Label>
          <Input id="imageAlt" value={alt} onChange={(event) => setAlt(event.target.value)} />
        </div>

        {pending ? null : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              className="w-auto"
              value={newStatus}
              onChange={(event) => setNewStatus(event.target.value as EntryStatus)}
            >
              <option value="published">Published</option>
              <option value="rejected">Rejected</option>
              <option value="deleted">Deleted</option>
              <option value="pending">Pending</option>
            </Select>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={formState.isSubmitting}>
            Save
          </Button>
          {pending ? (
            <Button
              type="button"
              variant="secondary"
              disabled={formState.isSubmitting}
              onClick={handleSubmit((edit) => submit(edit, 'approve'))}
            >
              Save and approve
            </Button>
          ) : null}
        </div>
      </form>
    </FormProvider>
  );
}
