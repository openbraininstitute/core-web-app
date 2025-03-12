import { Metadata } from 'next';

import { fetchSanity } from '../content/content';
import { tryType } from '../content';
import queryTemplate from './metadata.groq';
import { DEFAULT_METADATA } from './default';
import { logError } from '@/util/logger';

export async function generateMetadataFromSanity(slug: string): Promise<Metadata> {
  const query = queryTemplate.replace('{{SLUG}}', slug);
  try {
    const content = await fetchSanity(query, isContentForSeo);
    if (!content) return DEFAULT_METADATA;

    return {
      title: content.seoTitle,
      description: content.seoDescription,
      keywords: content.seoKeywords,
      authors: [{ name: 'Open Brain Institute' }, { name: 'Henry Markram' }],
      creator: 'Open Brain Institute',
      openGraph: {
        title: content.title,
        description: content.seoDescription,
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
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

function isContentForSeo(data: unknown): data is ContentForSeo {
  return tryType('ContentForSeo', data, {
    title: 'string',
    seoTitle: 'string',
    seoDescription: 'string',
    seoKeywords: ['array', 'string'],
    imageURL: 'string',
    imageWidth: 'number',
    imageHeight: 'number',
  });
}
