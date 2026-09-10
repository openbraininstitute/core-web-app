import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.openbraininstitute.org';

const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/contact',
  '/features',
  '/financing',
  '/gallery',
  '/mission',
  '/news',
  '/pricing',
  '/privacy',
  '/showcases',
  '/team',
  '/terms',
  '/the-real-digital-brain-story',
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
  }));
}
