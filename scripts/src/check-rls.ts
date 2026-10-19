import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';

const USAGE = `Usage: tsx src/check-rls.ts [--url <supabase url>] [--anon-key <anon key>]

Proves, as the anon role, that Row Level Security and grants keep private data private. Safe to run
against the hosted project: it only reads, and every write it attempts is one the database must
refuse (an invalid value or a row id that matches nothing), so nothing can be created or changed
even if a grant were wrong. It refuses to run with a key that is not the anon key.

Reads SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_ANON_KEY (or
NEXT_PUBLIC_SUPABASE_ANON_KEY) unless given as flags. Exits 1 and lists every failed check.`;

const BUCKET = 'aaronism-images';
const NIL = '00000000-0000-0000-0000-000000000000';
/** Postgres `insufficient_privilege`: what a missing grant or revoked execute looks like. */
const DENIED = '42501';
const PAGE = 1000;

export type RlsFailure = { check: string; detail: string };
type ApiError = { code?: string; message: string } | null;

export type CheckOptions = {
  url: string;
  anonKey: string;
  /** Lets the tests prove the checks fail for a privileged key. Never set it from the CLI. */
  allowNonAnonKey?: boolean;
};

/** The `role` claim of a Supabase API key (a JWT), or null if it is not one. */
export function keyRole(key: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64url').toString());
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

export async function checkRls({ url, anonKey, allowNonAnonKey }: CheckOptions) {
  const role = keyRole(anonKey);
  if (role !== 'anon' && !allowNonAnonKey) {
    throw new Error(
      `The key is not an anon key (its role is ${role ?? 'unreadable'}). Never pass a service role key here.`,
    );
  }

  const db = createClient(url, anonKey, { auth: { persistSession: false } });
  const failures: RlsFailure[] = [];
  let passed = 0;

  const record = (name: string, problem: string | null) => {
    if (problem === null) passed += 1;
    else failures.push({ check: name, detail: problem });
  };
  /** Pass when the request was refused with a permission error. */
  const expectDenied = (name: string, error: ApiError) =>
    record(
      name,
      error?.code === DENIED
        ? null
        : error
          ? `expected permission denied, got ${error.code ?? 'error'}: ${error.message}`
          : 'the request was allowed',
    );
  /** Pass when the request returned an error or no rows (RLS filters rather than refuses). */
  const expectEmpty = (name: string, result: { data: unknown[] | null; error: ApiError }) =>
    record(
      name,
      result.error || !result.data?.length ? null : `returned ${result.data.length} row(s)`,
    );

  async function readAll(table: string, columns: string) {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from(table)
        .select(columns)
        .order('id')
        .range(from, from + PAGE - 1)
        .overrideTypes<Record<string, unknown>[]>();
      if (error) throw new Error(`${table}: ${error.message}`);
      rows.push(...data);
      if (data.length < PAGE) return rows;
    }
  }

  // Reads that must work, and must show nothing unpublished.
  const entries = await readAll('entries', 'id, status');
  record(
    'entries: only published rows are readable',
    entries.every((e) => e.status === 'published')
      ? null
      : `${entries.filter((e) => e.status !== 'published').length} unpublished row(s) returned`,
  );
  for (const status of ['pending', 'rejected']) {
    expectEmpty(
      `entries: ${status} rows are filtered`,
      await db.from('entries').select('id').eq('status', status),
    );
  }

  const publishedIds = new Set(entries.filter((e) => e.status === 'published').map((e) => e.id));
  const lines = await readAll('entry_lines', 'id, entry_id, speaker_id');
  const orphaned = lines.filter((l) => !publishedIds.has(l.entry_id));
  record(
    'entry_lines: only lines of published entries are readable',
    orphaned.length === 0 ? null : `${orphaned.length} line(s) of unpublished entries returned`,
  );

  const speakers = await readAll('speakers', 'id');
  const usedSpeakers = new Set(
    lines.filter((l) => publishedIds.has(l.entry_id)).map((l) => l.speaker_id),
  );
  const hidden = speakers.filter((s) => !usedSpeakers.has(s.id));
  record(
    'speakers: only speakers of published entries are readable',
    hidden.length === 0 ? null : `${hidden.length} speaker(s) without a published line returned`,
  );

  const memes = await readAll('memes', 'id, status');
  record(
    'memes: only published rows are readable',
    memes.every((m) => m.status === 'published') ? null : 'an unpublished meme was returned',
  );

  // Private columns: never granted, so naming one (or asking for everything) is refused.
  for (const column of ['submitted_by', 'submitter_ip', 'reviewed_by_email', 'decision_note']) {
    expectDenied(
      `entries.${column} cannot be selected`,
      (await db.from('entries').select(column)).error,
    );
  }
  expectDenied('entries: select * is refused', (await db.from('entries').select('*')).error);

  // Tables with no grant at all.
  expectDenied(
    'moderation_tokens cannot be read',
    (await db.from('moderation_tokens').select('id')).error,
  );
  expectDenied(
    'moderation_tokens.token_hash cannot be read',
    (await db.from('moderation_tokens').select('token_hash')).error,
  );
  expectDenied(
    'rate_limit_hits cannot be read',
    (await db.from('rate_limit_hits').select('bucket')).error,
  );

  // Storage: public URLs serve without a policy, and there is none, so listing finds nothing.
  const listed = await db.storage.from(BUCKET).list('', { limit: 5 });
  record(
    'storage: the bucket cannot be listed',
    listed.error || !listed.data?.length ? null : `listed ${listed.data.length} object(s)`,
  );

  // Writes. Each is doomed even if a grant were wrong: an invalid enum value, a missing required
  // value, a foreign key to nothing, or a filter on the nil UUID that matches no row.
  expectDenied(
    'entries: insert is refused',
    (await db.from('entries').insert({ slug: 'rls-check', status: 'not-a-status' })).error,
  );
  expectDenied(
    'entries: update is refused',
    (await db.from('entries').update({ status: 'not-a-status' }).eq('id', NIL)).error,
  );
  expectDenied(
    'entries: delete is refused',
    (await db.from('entries').delete().eq('id', NIL)).error,
  );
  expectDenied(
    'entry_lines: insert is refused',
    (await db.from('entry_lines').insert({ entry_id: NIL, position: 1, text: null })).error,
  );
  expectDenied(
    'entry_lines: update is refused',
    (await db.from('entry_lines').update({ text: null }).eq('id', NIL)).error,
  );
  expectDenied(
    'entry_lines: delete is refused',
    (await db.from('entry_lines').delete().eq('id', NIL)).error,
  );
  expectDenied(
    'speakers: insert is refused',
    (await db.from('speakers').insert({ name: null, slug: 'rls-check' })).error,
  );
  expectDenied(
    'speakers: update is refused',
    (await db.from('speakers').update({ name: null }).eq('id', NIL)).error,
  );
  expectDenied(
    'speakers: delete is refused',
    (await db.from('speakers').delete().eq('id', NIL)).error,
  );

  // RPCs. Execute is granted to anon only on the two public readers; every write entry point is
  // service-role only. The arguments have the wrong type, so a function wrongly left callable
  // fails on them without running (the privilege check comes first and yields a permission error).
  for (const [name, args] of Object.entries({
    create_submission: { p_entry_id: 'x', p_said_on: 'x', p_lines: 'x', p_tokens: 'x' },
    apply_entry_edits: { p_entry_id: 'x', p_lines: 'x' },
    merge_speakers: { p_from: 'x', p_into: 'x' },
    decide_entry: {
      p_token_hash: 'x',
      p_allowed_emails: 'x',
      p_decision: 'x',
      p_note: 'x',
      p_said_on: 'x',
      p_lines: 'x',
    },
    decide_entry_as_admin: {
      p_entry_id: 'x',
      p_admin_email: 'x',
      p_decision: 'x',
      p_note: 'x',
      p_said_on: 'x',
      p_lines: 'x',
    },
    moderation_token_state: { p_token_hash: 'x', p_allowed_emails: 'x' },
    consume_rate_limit: { p_bucket: 'x', p_limit: 'x', p_window_seconds: 'x' },
  })) {
    expectDenied(`rpc ${name} is not callable`, (await db.rpc(name, args)).error);
  }
  const search = await db.rpc('search_entries', { q: 'rls-check' });
  record('rpc search_entries is callable', search.error ? search.error.message : null);
  const random = await db.rpc('random_published_entry_slug');
  record('rpc random_published_entry_slug is callable', random.error ? random.error.message : null);

  return { passed, failures };
}

async function main() {
  const { values } = parseArgs({
    options: {
      url: { type: 'string' },
      'anon-key': { type: 'string' },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }
  const url = values.url ?? process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    values['anon-key'] ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error(USAGE);
    process.exitCode = 2;
    return;
  }

  console.log(`Checking Row Level Security as anon on ${new URL(url).host}`);
  const { passed, failures } = await checkRls({ url, anonKey });
  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) FAILED (${passed} passed):`);
    for (const { check, detail } of failures) console.error(`  x ${check}: ${detail}`);
    process.exitCode = 1;
    return;
  }
  console.log(`All ${passed} checks passed.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
