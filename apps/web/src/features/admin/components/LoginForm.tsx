'use client';

import { useActionState } from 'react';
import { Button } from '@aaronisms/ui/button';
import { Input } from '@aaronisms/ui/input';
import { Label } from '@aaronisms/ui/label';
import { requestMagicLink, type LoginState } from '../actions';

export type LoginFormProps = {
  /** Shown when the visitor was turned away, such as a signed-in address that is not the admin. */
  error?: string;
};

export function LoginForm({ error }: LoginFormProps) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(requestMagicLink, null);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email address</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? 'Sending…' : 'Email me a sign-in link'}
      </Button>
      {state ? (
        <p role="status" className="text-muted-foreground text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
