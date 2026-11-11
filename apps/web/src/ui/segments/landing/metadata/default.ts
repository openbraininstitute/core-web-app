import ImageURL from './default.jpg';

import type { Metadata } from 'next';

export const DEFAULT_METADATA: Metadata = {
  title: 'Open Brain Platform',
  description: 'Virtual labs to explore, build and simulate the brain',
  keywords: [
    'blue',
    'institute',
    'platform',
    'explore',
    'build',
    'model',
    'simulate',
    'brain',
    'simulation',
    'neuroscience',
    'virtual labs',
    'circuit',
    'cellular',
    'system',
  ],
  authors: [{ name: 'Open Brain Institute', url: 'https://www.openbraininstitute.org' }],
  openGraph: {
    title: 'Open Brain Institute',
    description: 'Virtual labs to explore, build and simulate the brain',
    authors: ['Open Brain Institute'],
    images: [
      {
        url: ImageURL.src,
        width: 900,
        height: 600,
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: true,
    },
  },
  metadataBase: new URL('https://www.openbrainplatform.com'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en-US',
    },
  },
};
