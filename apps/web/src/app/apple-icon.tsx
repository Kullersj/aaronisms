import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** The open banana from icon.svg on a pale background (iOS fills transparent icons with black). */
export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#fef9c3' }}>
      <svg width="180" height="180" viewBox="0 0 32 32">
        <path
          d="M11.5 16 C11.5 8 13 2.5 16 2.5 C19 2.5 20.5 8 20.5 16 Z"
          fill="#fef3c7"
          stroke="#a16207"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M11 14 L21 14 L20 26 L12 26 Z"
          fill="#facc15"
          stroke="#a16207"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M12 14 C8 12.5 4.5 15.5 3.5 21.5 C6.5 20 9 18.5 12 18.5 Z"
          fill="#facc15"
          stroke="#a16207"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M20 14 C24 12.5 27.5 15.5 28.5 21.5 C25.5 20 23 18.5 20 18.5 Z"
          fill="#facc15"
          stroke="#a16207"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M13.5 14.5 C14 18.5 15 21 16 22.5 C17 21 18 18.5 18.5 14.5 Z"
          fill="#eab308"
          stroke="#a16207"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <rect x="14" y="25.5" width="4" height="4.5" rx="1" fill="#78350f" />
      </svg>
    </div>,
    size,
  );
}
