import { ImageResponse } from 'next/og';
import { getEntryBySlug } from '@/features/entries/queries';
import { ogContent } from '@/features/entries/og';
import { formatEntryDate } from '@/features/entries/utils';

export const dynamic = 'force-dynamic';
export const alt = 'An Aaronism';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type ImageProps = { params: Promise<{ slug: string }> };

/** Quote card for sharing a permalink. Only published entries render; anything else is a 404. */
export default async function Image({ params }: ImageProps) {
  const { slug } = await params;
  const entry = await getEntryBySlug(slug);
  if (!entry) return new Response('Not found', { status: 404 });

  const { lines, truncated } = ogContent(entry);
  const chars = lines.reduce((n, l) => n + l.text.length + (l.speaker?.length ?? 0), 0);
  const fontSize = chars > 180 ? 40 : chars > 110 ? 48 : 58;
  const date = entry.saidOn ? formatEntryDate(entry.saidOn) : 'The College Years';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#171717',
        color: '#ffffff',
        padding: 72,
      }}
    >
      <div style={{ display: 'flex', fontSize: 40, color: '#a3a3a3' }}>{date}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontSize }}>
        {lines.map((line, index) => (
          <div key={index} style={{ display: 'flex', flexWrap: 'wrap', lineHeight: 1.25 }}>
            {line.speaker ? (
              <span style={{ fontWeight: 700, marginRight: 14 }}>{line.speaker}:</span>
            ) : null}
            <span style={{ fontStyle: 'italic' }}>{line.text}</span>
          </div>
        ))}
        {truncated ? <div style={{ display: 'flex', color: '#a3a3a3' }}>…</div> : null}
      </div>
      <div style={{ display: 'flex', fontSize: 44, fontWeight: 300, letterSpacing: -1 }}>
        Aaronisms
      </div>
    </div>,
    size,
  );
}
