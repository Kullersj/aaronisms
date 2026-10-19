import type { OgLine } from '../og';
import { ogFontSize } from '../og';

/** The generic site card, in the header's dark style. Also stands in for entries with no preview. */
export function SiteCard() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#171717',
        color: '#ffffff',
      }}
    >
      <div style={{ display: 'flex', fontSize: 140, fontWeight: 300, letterSpacing: -4 }}>
        Aaronisms
      </div>
      <div style={{ display: 'flex', fontSize: 44, color: '#a3a3a3', marginTop: 12 }}>
        Peruse at risk
      </div>
    </div>
  );
}

export type QuoteCardProps = { date: string; lines: OgLine[]; truncated: boolean };

/** The quote card for one entry. */
export function QuoteCard({ date, lines, truncated }: QuoteCardProps) {
  return (
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          fontSize: ogFontSize(lines),
          // Never overlap the date or the footer, whatever the content.
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {lines.map((line, index) => (
          // One item per word, so wrapping is natural and a long word breaks inside its own box.
          <div key={index} style={{ display: 'flex', flexWrap: 'wrap', columnGap: '0.3em' }}>
            {line.speaker ? (
              <span style={{ fontWeight: 700, wordBreak: 'break-word' }}>{line.speaker}:</span>
            ) : null}
            {line.text.split(' ').map((word, i) => (
              <span key={i} style={{ fontStyle: 'italic', wordBreak: 'break-word' }}>
                {word}
              </span>
            ))}
          </div>
        ))}
        {truncated ? <div style={{ display: 'flex', color: '#a3a3a3' }}>…</div> : null}
      </div>
      <div style={{ display: 'flex', fontSize: 44, fontWeight: 300, letterSpacing: -1 }}>
        Aaronisms
      </div>
    </div>
  );
}
