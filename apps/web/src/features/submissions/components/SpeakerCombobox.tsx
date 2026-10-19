'use client';

import { useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@aaronisms/ui/button';
import { Command, CommandInput, CommandItem, CommandList } from '@aaronisms/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@aaronisms/ui/popover';

export type SpeakerComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  /** Known speaker names to suggest. Anything else the user types can be added. */
  speakers: string[];
  /** Accessible name for the trigger, such as "Speaker for line 2". */
  label: string;
  invalid?: boolean;
};

const MAX_SUGGESTIONS = 50;

export function SpeakerCombobox({
  value,
  onChange,
  speakers,
  label,
  invalid,
}: SpeakerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const typed = query.trim();
  const needle = typed.toLowerCase();
  const matches = speakers.filter((name) => name.toLowerCase().includes(needle));
  const isNew = typed !== '' && !speakers.some((name) => name.toLowerCase() === needle);

  function choose(name: string) {
    onChange(name);
    setOpen(false);
    setQuery('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          aria-invalid={invalid || undefined}
          className="min-w-0 flex-1 justify-between font-normal aria-invalid:border-red-500"
        >
          <span className={value ? 'truncate' : 'text-muted-foreground'}>{value || 'Speaker'}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-64">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or add a speaker"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {matches.slice(0, MAX_SUGGESTIONS).map((name) => (
              <CommandItem key={name} value={name} onSelect={() => choose(name)}>
                {name}
              </CommandItem>
            ))}
            {isNew ? (
              <CommandItem value={`add:${typed}`} onSelect={() => choose(typed)}>
                Add “{typed}”
              </CommandItem>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
