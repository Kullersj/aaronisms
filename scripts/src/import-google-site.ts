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
import { check, chunk, createServiceClient, type Db } from './supabase';

const BUCKET = 'aaronism-images';

const USAGE = `Usage: tsx src/import-google-site.ts --dir <saved pages> [options]

  --dir <path>         Folder with the saved pages (home, the-college-years, dont-let-your-memes-be-dreams)
  --home|--college|--memes <file>   Explicit page paths (override --dir)
  --images-dir <path>  Folder from fetch-google-site-images.mjs (manifest.json) or other saved images
  --dry-run            Parse and report only; writes nothing
  --reset              Delete the imported entries (and memes) first, then import again

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

  const db = createServiceClient();
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

  // An entry with no lines is left over from a failed run: delete it so this run recreates it.
  // Anything with lines is kept, so a pending form submission that shares a slug is never deleted.
  const existing = new Set<string>();
  const leftovers: string[] = [];
  for (const batch of chunk(slugs, 100)) {
    for (const row of check(
      await db.from('entries').select('slug, status, entry_lines(count)').in('slug', batch),
      'Read slugs',
    ) ?? []) {
      const hasLines = (row.entry_lines[0]?.count ?? 0) > 0;
      if (hasLines || row.status === 'rejected') existing.add(row.slug);
      else leftovers.push(row.slug);
    }
  }
  for (const batch of chunk(leftovers, 100)) {
    check(await db.from('entries').delete().in('slug', batch), 'Delete incomplete entries');
  }
  const fresh = plans.filter((plan) => !existing.has(plan.slug));

  const speakerRows = speakerNames(fresh).map((name) => ({ name, slug: slugForSpeaker(name) }));
  const savedSpeakers =
    check(
      await db.from('speakers').upsert(speakerRows, { onConflict: 'name' }).select('id, name'),
      'Upsert speakers',
    ) ?? [];
  const speakerIds = new Map(savedSpeakers.map((speaker) => [speaker.name, speaker.id]));

  const publishedAt = new Date().toISOString();
  const entryIds = new Map(fresh.map((plan) => [plan.slug, crypto.randomUUID()]));
  for (const upload of fresh.flatMap((plan) => uploads.get(plan.slug) ?? []))
    await store(db, upload);

  const entryRows = fresh.map((plan) => ({
    id: entryIds.get(plan.slug) ?? '',
    slug: plan.slug,
    said_on: plan.saidOn,
    era: plan.era,
    status: 'pending' as const,
    image_path: uploads.get(plan.slug)?.path ?? null,
  }));
  for (const batch of chunk(entryRows, 100))
    check(await db.from('entries').insert(batch), 'Insert entries');

  const lineRows = fresh.flatMap((plan) =>
    plan.lines.map((line) => ({
      entry_id: entryIds.get(plan.slug) ?? '',
      position: line.position,
      kind: line.kind,
      speaker_id: line.speakerName ? (speakerIds.get(line.speakerName) ?? null) : null,
      speaker_label: line.speakerLabel,
      text: line.text,
    })),
  );
  for (const batch of chunk(lineRows, 200))
    check(await db.from('entry_lines').insert(batch), 'Insert lines');

  // Publish only once every line is in, so a failed run never leaves a half-published entry.
  for (const batch of chunk([...entryIds.values()], 100)) {
    check(
      await db
        .from('entries')
        .update({ status: 'published', published_at: publishedAt })
        .in('id', batch),
      'Publish entries',
    );
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
