import { fetchSanity } from '@/services/sanity';
import { logError } from '@/util/logger';

import { tryType, typeStringOrNull } from '../content';
import { DEFAULT_METADATA } from './default';
import queryTemplate from './metadata.groq';

import type { Metadata } from 'next';

export async function generateMetadataFromSanity(slug: string): Promise<Metadata> {
  const query = queryTemplate.replace('{{SLUG}}', slug);
  try {
    const content = await fetchSanity(query, isContentForSeo);
    if (!content) return DEFAULT_METADATA;

    return {
      title: content.seoTitle ?? content.title,
      description: content.seoDescription,
      keywords: content.seoKeywords ?? [],
      authors: [{ name: 'Open Brain Institute' }, { name: 'Henry Markram' }],
      creator: 'Open Brain Institute',
      openGraph: {
        title: content.title,
        description: content.seoDescription ?? '',
        images: [
          {
            url: content.imageURL,
            width: content.imageWidth,
            height: content.imageHeight,
          },
        ],
        type: 'website',
      },
    };
  } catch (ex) {
    logError('Unable to retrieve SEO content from Sanity!', ex, query);
    return DEFAULT_METADATA;
  }
}

interface ContentForSeo {
  title: string;
  seoTitle: null | string;
  seoDescription: null | string;
  seoKeywords: null | string[];
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

function isContentForSeo(data: unknown): data is ContentForSeo {
  if (data === null || data === undefined) return false;
  return tryType('ContentForSeo', data, {
    title: 'string',
    seoTitle: typeStringOrNull,
    seoDescription: typeStringOrNull,
    seoKeywords: ['|', 'null', ['array', 'string']],
    imageURL: 'string',
    imageWidth: 'number',
    imageHeight: 'number',
  });
}
