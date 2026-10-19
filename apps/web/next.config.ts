import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@aaronisms/ui'],
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
