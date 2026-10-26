import type { NextConfig } from 'next';

type RemotePattern = NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>[number];

const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';

/**
 * Storage images are served from Supabase, so `next/image` must allow that host. Read at build
 * time from NEXT_PUBLIC_SUPABASE_URL; local development falls back to the local stack.
 */
function imageRemotePatterns() {
  const urls = [process.env.NEXT_PUBLIC_SUPABASE_URL];
  if (process.env.NODE_ENV !== 'production') urls.push(LOCAL_SUPABASE_URL);
  const patterns: RemotePattern[] = [];
  for (const value of urls) {
    if (!value) continue;
    try {
      const url = new URL(value);
      patterns.push({
        protocol: url.protocol === 'http:' ? 'http' : 'https',
        hostname: url.hostname,
        port: url.port,
        pathname: '/storage/v1/object/public/**',
      });
    } catch {
      // An invalid URL is reported at request time by getPublicEnv().
    }
  }
  return patterns;
}

const remotePatterns = imageRemotePatterns();
const usesLocalSupabase = remotePatterns.some((p) =>
  ['127.0.0.1', 'localhost'].includes(p.hostname),
);

const nextConfig: NextConfig = {
  experimental: {
    // Submissions carry a photo of up to 5 MB, plus multipart overhead.
    serverActions: { bodySizeLimit: '6mb' },
  },
  images: {
    remotePatterns,
    // The optimizer refuses private addresses unless told otherwise; only needed for local Supabase.
    dangerouslyAllowLocalIP: usesLocalSupabase,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet, noimageindex',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/home', destination: '/', permanent: true },
      { source: '/the-college-years', destination: '/college', permanent: true },
      { source: '/dont-let-your-memes-be-dreams', destination: '/memes', permanent: true },
    ];
  },
};

export default nextConfig;
