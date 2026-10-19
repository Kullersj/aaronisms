import type { MetadataRoute } from 'next';

// Permissive on purpose: crawlers must be able to fetch pages to see their noindex.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/' } };
}
