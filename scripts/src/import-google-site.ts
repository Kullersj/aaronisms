import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { slugForSpeaker } from '@aaronisms/db/slug';
import { resolvePagePaths } from './google-sites/files';
import { resolveUserPath } from './paths';
import {
  findImage,
  loadManifest,
  type FoundImage,
  type ImageContext,
  type PageKey,
} from './google-sites/images';
import { parseGoogleSitesPage, parseImages, type Era } from './google-sites/parse';
import { createSpeakerRegistry, planEntries, type PlannedEntry } from './google-sites/plan';
import { lineSignature } from './form-responses';
import { check, chunk, createServiceClient, serviceTarget, type Db } from './supabase';

const BUCKET = 'aaronism-images';

const USAGE = `Usage: tsx src/import-google-site.ts --dir <saved pages> [options]

  --dir <path>         Folder with the saved pages (home, the-college-years, dont-let-your-memes-be-dreams)
  --home|--college|--memes <file>   Explicit page paths (override --dir)
  --images-dir <path>  Folder from fetch-google-site-images.mjs (manifest.json) or other saved images
  --dry-run            Parse and report only; writes nothing
  --reset              Delete the imported entries (and memes) first, then import again (needs --yes)
  --yes                Confirm a destructive --reset against the project that is printed first

Needs SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY unless --dry-run.`;

export type Upload = { path: string; image: FoundImage };
type Imported = { plan: PlannedEntry; page: PageKey };

const log = (message: string) => console.error(message);

async function main() {
  const { values } = parseArgs({
    options: {
      dir: { type: 'string' },
      home: { type: 'string' },
      college: { type: 'string' },
      memes: { type: 'string' },
      'images-dir': { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      reset: { type: 'boolean', default: false },
      yes: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help || (!values.dir && !values.home && !values.college && !values.memes)) {
    console.log(USAGE);
    return;
  }
  const pages = resolvePagePaths(values.dir && resolveUserPath(values.dir), {
    ...(values.home && { home: resolveUserPath(values.home) }),
    ...(values.college && { college: resolveUserPath(values.college) }),
    ...(values.memes && { memes: resolveUserPath(values.memes) }),
  });
  const imagesDir = values['images-dir'] ? resolveUserPath(values['images-dir']) : undefined;
  const manifest = await loadManifest(imagesDir);

  const speakers = createSpeakerRegistry();
  const imported: Imported[] = [];
  for (const [file, era, page] of [
    [pages.home, 'modern', 'home'],
    [pages.college, 'college', 'the-college-years'],
  ] as [string, Era, PageKey][]) {
    const parsed = parseGoogleSitesPage(await readFile(file, 'utf8'), era);
    for (const plan of planEntries(parsed, era, speakers)) imported.push({ plan, page });
  }

  const memeImages = parseImages(await readFile(pages.memes, 'utf8'));

  // Resolve every image up front so a dry run reports exactly what an import would upload.
  const uploads = new Map<string, Upload>();
  const missing: { page: string; slug: string; src: string }[] = [];
  const entryContext = (file: string): ImageContext => ({
    pageDir: path.dirname(file),
    imagesDir,
    manifest,
  });
  for (const { plan, page } of imported) {
    if (!plan.imageSrc) continue;
    const file = page === 'home' ? pages.home : pages.college;
    const image = await findImage(
      { page, sectionIndex: plan.sectionIndex, saidOn: plan.saidOn, order: 0, src: plan.imageSrc },
      entryContext(file),
    );
    if (image) uploads.set(plan.slug, { path: `imported/${plan.slug}.${image.extension}`, image });
    else missing.push({ page, slug: plan.slug, src: plan.imageSrc });
  }
  const memeUploads: Upload[] = [];
  for (const [index, meme] of memeImages.entries()) {
    const image = await findImage(
      {
        page: 'dont-let-your-memes-be-dreams',
        sectionIndex: meme.sectionIndex,
        saidOn: null,
        order: meme.order,
        src: meme.src,
      },
      entryContext(pages.memes),
    );
    if (image) memeUploads.push({ path: `imported/meme-${index + 1}.${image.extension}`, image });
    else
      missing.push({
        page: 'dont-let-your-memes-be-dreams',
        slug: `meme-${index + 1}`,
        src: meme.src,
      });
  }
  for (const item of missing) log(`Missing image for ${item.slug}: ${item.src}`);

  const plans = imported.map((item) => item.plan);
  const lineCount = plans.reduce((sum, plan) => sum + plan.lines.length, 0);
  const summary = {
    modernEntries: plans.filter((plan) => plan.era === 'modern').length,
    collegeEntries: plans.filter((plan) => plan.era === 'college').length,
    lines: lineCount,
    speakers: speakers.names,
    entryImagesFound: uploads.size,
    memeImagesFound: memeUploads.length,
    missingImages: missing,
  };

  if (values['dry-run']) {
    console.log(JSON.stringify({ dryRun: true, ...summary, sample: plans.slice(0, 3) }, null, 2));
    return;
  }

  const target = serviceTarget();
  log(`Writing to ${target.host}`);
  if (values.reset && !values.yes) {
    throw new Error(
      `--reset deletes the imported entries and memes on ${target.host}, including moderation decisions and edits. Run again with --yes to confirm.`,
    );
  }
  const db = createServiceClient(target);
  const result = await writeToDatabase(db, plans, uploads, memeUploads, values.reset);
  console.log(JSON.stringify({ ...summary, ...result }, null, 2));
}

export async function writeToDatabase(
  db: Db,
  plans: PlannedEntry[],
  uploads: Map<string, Upload>,
  memeUploads: Upload[],
  reset: boolean,
) {
  const slugs = plans.map((plan) => plan.slug);

  if (reset) {
    for (const batch of chunk(slugs, 100)) {
      check(await db.from('entries').delete().in('slug', batch), 'Reset entries');
    }
    check(await db.from('memes').delete().like('image_path', 'imported/%'), 'Reset memes');
  }

  // Work out which planned entries are already on the site. An entry counts as imported when an
  // entry on the same date (or any College Years entry, for undated plans) has the same lines, so a
  // slug taken by a form submission or an admin edit does not hide a real entry.
  const dates = [...new Set(plans.flatMap((plan) => plan.saidOn ?? []))];
  const rows: ExistingEntry[] = [];
  for (const batch of chunk(dates, 100)) {
    rows.push(...(check(await selectEntries(db).in('said_on', batch), 'Read entries') ?? []));
  }
  if (plans.some((plan) => plan.saidOn === null)) {
    rows.push(
      ...(check(await selectEntries(db).eq('era', 'college'), 'Read college entries') ?? []),
    );
  }
  const slugRows = new Map(rows.map((row) => [row.slug, row]));
  const taken = new Set(slugRows.keys());
  const leftovers: string[] = [];
  const fresh: { plan: PlannedEntry; slug: string }[] = [];
  for (const plan of plans) {
    const signature = lineSignature(plan.lines);
    const sameScope = rows.filter((row) => row.said_on === plan.saidOn);
    if (sameScope.some((row) => lineSignature(row.entry_lines) === signature)) continue;
    // A pending entry that no moderator touched and holds only the start of this entry's lines
    // (or none) is left over from a failed run: delete it so this run recreates it.
    const same = slugRows.get(plan.slug);
    // A moderator's decision (rejected or deleted) is never undone by a re-import.
    if (same && (same.status === 'rejected' || same.status === 'deleted')) continue;
    if (same && isPartialImport(same, plan)) {
      leftovers.push(same.id);
      taken.delete(plan.slug);
    }
    // Any other row on the slug is a different entry (for example a form submission): keep it
    // and give this one the next free slug.
    const slug = taken.has(plan.slug) ? nextFreeSlug(plan, taken) : plan.slug;
    taken.add(slug);
    fresh.push({ plan, slug });
  }
  for (const batch of chunk(leftovers, 100)) {
    check(await db.from('entries').delete().in('id', batch), 'Delete incomplete entries');
  }

  const speakerRows = speakerNames(fresh.map((item) => item.plan)).map((name) => ({
    name,
    slug: slugForSpeaker(name),
  }));
  // Match speakers by slug, as the database and the web do. Existing rows keep their name, so an
  // admin rename or merge is not undone; only missing speakers are inserted.
  check(
    await db.from('speakers').upsert(speakerRows, { onConflict: 'slug', ignoreDuplicates: true }),
    'Upsert speakers',
  );
  const speakerIds = new Map<string, string>();
  for (const batch of chunk(
    speakerRows.map((row) => row.slug),
    100,
  )) {
    for (const speaker of check(
      await db.from('speakers').select('id, slug').in('slug', batch),
      'Read speakers',
    ) ?? [])
      speakerIds.set(speaker.slug, speaker.id);
  }

  // Each entry is written as a unit: pending entry, all its lines, then publish. If any step
  // fails the entry is deleted (its lines cascade), so a failed run never leaves one with only
  // some of its lines; the run stops and a re-run recreates it.
  const publishedAt = new Date().toISOString();
  for (const { plan, slug } of fresh) {
    const upload = uploads.get(plan.slug);
    if (upload) await store(db, upload);
    const id = crypto.randomUUID();
    check(
      await db.from('entries').insert({
        id,
        slug,
        said_on: plan.saidOn,
        era: plan.era,
        status: 'pending' as const,
        image_path: upload?.path ?? null,
      }),
      'Insert entry',
    );
    try {
      const lineRows = plan.lines.map((line) => ({
        entry_id: id,
        position: line.position,
        kind: line.kind,
        speaker_id: line.speakerName
          ? (speakerIds.get(slugForSpeaker(line.speakerName)) ?? null)
          : null,
        speaker_label: line.speakerLabel,
        text: line.text,
      }));
      for (const batch of chunk(lineRows, 200))
        check(await db.from('entry_lines').insert(batch), 'Insert lines');
      check(
        await db
          .from('entries')
          .update({ status: 'published', published_at: publishedAt })
          .eq('id', id),
        'Publish entry',
      );
    } catch (error) {
      await db.from('entries').delete().eq('id', id);
      throw error;
    }
  }

  let memesAdded = 0;
  const knownMemes = new Set(
    (check(await db.from('memes').select('image_path'), 'Read memes') ?? []).map(
      (meme) => meme.image_path,
    ),
  );
  for (const upload of memeUploads) {
    await store(db, upload);
    if (knownMemes.has(upload.path)) continue;
    check(
      await db.from('memes').insert({ image_path: upload.path, status: 'published' }),
      'Insert meme',
    );
    memesAdded++;
  }

  return {
    entriesInserted: fresh.length,
    entriesSkippedExisting: plans.length - fresh.length,
    memesAdded,
  };
}

type ExistingEntry = {
  id: string;
  slug: string;
  said_on: string | null;
  status: string;
  reviewed_by_email: string | null;
  entry_lines: { position: number; text: string }[];
};

const selectEntries = (db: Db) =>
  db
    .from('entries')
    .select('id, slug, said_on, status, reviewed_by_email, entry_lines(position, text)');

/** A pending, never-moderated entry whose lines are a prefix of the plan's (possibly empty). */
function isPartialImport(row: ExistingEntry, plan: PlannedEntry): boolean {
  if (row.status !== 'pending' || row.reviewed_by_email !== null) return false;
  const have = [...row.entry_lines].sort((x, y) => x.position - y.position);
  return (
    have.length < plan.lines.length && have.every((line, i) => line.text === plan.lines[i]?.text)
  );
}

/** `<date>-N` or `college-N` with N one past the highest taken suffix for the same prefix. */
function nextFreeSlug(plan: PlannedEntry, taken: Set<string>): string {
  const prefix = plan.saidOn ? `${plan.saidOn}-` : 'college-';
  let highest = 0;
  for (const slug of taken) {
    const suffix = slug.startsWith(prefix) ? slug.slice(prefix.length) : '';
    if (/^\d+$/.test(suffix)) highest = Math.max(highest, Number(suffix));
  }
  return `${prefix}${highest + 1}`;
}

function speakerNames(plans: PlannedEntry[]): string[] {
  return [...new Set(plans.flatMap((plan) => plan.lines.map((line) => line.speakerName)))].filter(
    (name): name is string => name !== null,
  );
}

async function store(db: Db, upload: Upload) {
  const { error } = await db.storage.from(BUCKET).upload(upload.path, upload.image.bytes, {
    contentType: upload.image.contentType,
    upsert: true,
  });
  if (error) throw new Error(`Upload ${upload.path}: ${error.message}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
