#!/usr/bin/env node
// Downloads the images embedded in the live aaronisms.net Google Sites pages, which a
// browser "Save page" does not keep. Run it on a machine that can reach the site:
//
//   node scripts/fetch-google-site-images.mjs [outDir]
//
// Writes the images plus a manifest.json that the importer uses to attach each image to
// its entry (matched by page, date heading and order within the entry).
// No dependencies: needs Node 18+ for the global fetch.

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const SITE = 'https://www.aaronisms.net';
const PAGES = ['home', 'the-college-years', 'dont-let-your-memes-be-dreams'];
const DATE =
  /(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}/;
const IMG = /<img\b[^>]*\bsrc="(https:\/\/lh\d*(?:-\w+)?\.googleusercontent\.com\/[^"]+)"/g;
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };

const outDir = resolve(process.argv[2] ?? 'aaronisms-images');
const decode = (s) => s.replaceAll('&amp;', '&');
// Google Sites splits text across adjacent spans ("October 6" + ", 202" + "5"), so join without spaces.
const text = (html) => html.replace(/<[^>]+>/g, '').replace(/&nbsp;|\s+/g, ' ');

async function main() {
  await mkdir(outDir, { recursive: true });
  const manifest = [];

  for (const page of PAGES) {
    const res = await fetch(`${SITE}/${page}`);
    if (!res.ok) throw new Error(`GET /${page} failed: ${res.status}`);
    const html = await res.text();

    // Google Sites renders each content block as a <section>; dated entries have a date heading.
    const sections = html.split(/<section\b/).slice(1);
    for (const [sectionIndex, section] of sections.entries()) {
      const urls = [...section.matchAll(IMG)].map((m) => decode(m[1]));
      if (urls.length === 0) continue;
      const heading = section.match(/<h2\b[\s\S]*?<\/h2>/)?.[0];
      const date = heading ? (text(heading).match(DATE)?.[0] ?? null) : null;

      for (const [order, url] of urls.entries()) {
        const img = await fetch(url);
        if (!img.ok) {
          console.warn(`! ${page} ${date ?? `section ${sectionIndex}`}: ${img.status} for ${url}`);
          continue;
        }
        const type = img.headers.get('content-type')?.split(';')[0] ?? '';
        const file = `${page}-${String(manifest.length + 1).padStart(2, '0')}.${EXT[type] ?? 'jpg'}`;
        await writeFile(join(outDir, file), Buffer.from(await img.arrayBuffer()));
        manifest.push({ page, date, sectionIndex, order, file, url });
        console.log(`✓ ${file}  ${page}  ${date ?? '(no date)'}`);
      }
    }
  }

  await writeFile(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nSaved ${manifest.length} images and manifest.json to ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
