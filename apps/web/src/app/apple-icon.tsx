import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** The banana from icon.svg on a pale background (iOS fills transparent icons with black). */
export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#fef9c3' }}>
      <svg width="180" height="180" viewBox="0 0 32 32">
        <path
          d="M8 6 C3 18 10 29 27 26 C29.5 25.5 29 22.5 26.5 22.5 C19 22.5 15 16 15 6 Z"
          fill="#facc15"
          stroke="#a16207"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <rect x="8" y="2.5" width="7" height="4.5" rx="1.2" fill="#78350f" />
        <circle cx="27" cy="24.3" r="2.2" fill="#78350f" />
      </svg>
    </div>,
    size,
  );
}
