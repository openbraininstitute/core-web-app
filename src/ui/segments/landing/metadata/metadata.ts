import { getLocalMetadata } from '@/content/website/content';
import { usesSanityContent } from '@/content/website/sources';
import { tryType, typeStringOrNull } from '@/services/sanity/type-utils';
import { logError } from '@/utils/logger';

import { getSanityPagesSlugPredicate } from '../utils';
import { DEFAULT_METADATA } from './default';
import queryTemplate from './metadata.groq';

import type { Metadata } from 'next';

export async function generateWebsiteMetadata(slug: string): Promise<Metadata> {
  const slugPred = getSanityPagesSlugPredicate(slug);
  const query = queryTemplate.replace('<SLUG_PRED>', slugPred);
  try {
    const content = usesSanityContent(slug)
      ? await (await import('@/services/sanity/hooks')).fetchSanity(query, isContentForSeo)
      : await getLocalMetadata(slug);
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
        ...(content.imageURL && {
          images: [
            {
              url: content.imageURL,
              width: content.imageWidth ?? undefined,
              height: content.imageHeight ?? undefined,
            },
          ],
        }),
        type: 'website',
      },
    };
  } catch (ex) {
    logError('Unable to retrieve website SEO content!', ex, query);
    return DEFAULT_METADATA;
  }
}

interface ContentForSeo {
  title: string;
  seoTitle: null | string;
  seoDescription: null | string;
  seoKeywords: null | string[];
  imageURL: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
}

function isContentForSeo(data: unknown): data is ContentForSeo {
  if (data === null || data === undefined) return false;
  return tryType('ContentForSeo', data, {
    title: 'string',
    seoTitle: typeStringOrNull,
    seoDescription: typeStringOrNull,
    seoKeywords: ['|', 'null', ['array', 'string']],
    imageURL: typeStringOrNull,
    imageWidth: ['|', 'number', 'null', 'undefined'],
    imageHeight: ['|', 'number', 'null', 'undefined'],
  });
}
