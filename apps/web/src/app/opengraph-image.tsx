import { ImageResponse } from 'next/og';

export const alt = 'Aaronisms';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The default card for every page without its own, in the header's dark style. */
export default function Image() {
  return new ImageResponse(
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
    </div>,
    size,
  );
}
