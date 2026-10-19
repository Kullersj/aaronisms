import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { slugForEntry } from '@aaronisms/db/slug';
import { parse } from 'csv-parse/sync';
import { DEFAULT_COLUMNS, rowToSubmission, type PendingSubmission } from './form-responses';
import { createSpeakerRegistry } from './google-sites/plan';
import { check, createServiceClient, type Db } from './supabase';

const USAGE = `Usage: tsx src/import-form-responses.ts --csv <responses.csv> [options]

Imports Google Form responses (exported from the response Sheet as CSV) as pending entries.
Responses whose text already appears on the site are skipped.

  --csv <path>        CSV export of the form responses
  --timestamp-col     Default "${DEFAULT_COLUMNS.timestamp}"
  --who-col           Default "${DEFAULT_COLUMNS.who}"
  --what-col          Default "${DEFAULT_COLUMNS.what}"
  --name-col          Default "${DEFAULT_COLUMNS.name}"
  --dry-run           Print what would be imported; writes nothing

Needs SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY unless --dry-run.`;

const { values } = parseArgs({
  options: {
    csv: { type: 'string' },
    'timestamp-col': { type: 'string', default: DEFAULT_COLUMNS.timestamp },
    'who-col': { type: 'string', default: DEFAULT_COLUMNS.who },
    'what-col': { type: 'string', default: DEFAULT_COLUMNS.what },
    'name-col': { type: 'string', default: DEFAULT_COLUMNS.name },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});

async function main() {
  if (values.help || !values.csv) {
    console.log(USAGE);
    return;
  }
  const columns = {
    timestamp: values['timestamp-col'],
    who: values['who-col'],
    what: values['what-col'],
    name: values['name-col'],
  };
  const rows: Record<string, string>[] = parse(await readFile(values.csv, 'utf8'), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
  const submissions = rows.flatMap((row) => rowToSubmission(row, columns) ?? []);
  const unusable = rows.length - submissions.length;

  if (values['dry-run']) {
    console.log(
      JSON.stringify(
        { dryRun: true, rows: rows.length, unusable, sample: submissions.slice(0, 3) },
        null,
        2,
      ),
    );
    return;
  }

  const result = await insertPending(createServiceClient(), submissions);
  console.log(JSON.stringify({ rows: rows.length, unusable, ...result }, null, 2));
}

async function insertPending(db: Db, submissions: PendingSubmission[]) {
  const speakers = createSpeakerRegistry();
  const known = new Map(
    (check(await db.from('speakers').select('id, name'), 'Read speakers') ?? []).map((s) => [
      speakers.canonicalName(s.name),
      s.id,
    ]),
  );
  const counters = new Map<string, number>();
  let inserted = 0;
  let duplicates = 0;

  for (const submission of submissions) {
    const texts = submission.lines.filter((l) => l.kind === 'line').map((l) => l.text);
    const existing = check(
      await db.from('entry_lines').select('id').in('text', texts).limit(1),
      'Check duplicates',
    );
    if (existing?.length) {
      duplicates++;
      continue;
    }

    if (!counters.has(submission.saidOn)) {
      const taken = check(
        await db.from('entries').select('slug').like('slug', `${submission.saidOn}-%`),
        'Read slugs',
      );
      counters.set(submission.saidOn, taken?.length ?? 0);
    }
    const n = (counters.get(submission.saidOn) ?? 0) + 1;
    counters.set(submission.saidOn, n);

    const entry = check(
      await db
        .from('entries')
        .insert({
          slug: slugForEntry(submission.saidOn, n),
          said_on: submission.saidOn,
          status: 'pending',
          submitted_by: submission.submittedBy,
        })
        .select('id')
        .single(),
      'Insert entry',
    );
    if (!entry) throw new Error('Insert entry: no row returned');
    check(
      await db.from('entry_lines').insert(
        submission.lines.map((line) => {
          const speakerId = line.speaker
            ? known.get(speakers.canonicalName(line.speaker))
            : undefined;
          return {
            entry_id: entry.id,
            position: line.position,
            kind: line.kind,
            speaker_id: speakerId ?? null,
            speaker_label: speakerId ? null : line.speaker,
            text: line.text,
          };
        }),
      ),
      'Insert lines',
    );
    inserted++;
  }
  return { inserted, skippedAlreadyOnSite: duplicates };
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
