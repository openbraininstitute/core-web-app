import type { MetadataRoute } from 'next';

/**
 * The platform as an app on a phone's home screen (the user asked for the browser's bars gone): added from the
 * browser's share menu, it opens on its own, with no address bar or tabs. No `start_url`, so it opens on the page it
 * was added from.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Open Brain Platform',
    short_name: 'OBI',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/images/app-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/images/app-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
