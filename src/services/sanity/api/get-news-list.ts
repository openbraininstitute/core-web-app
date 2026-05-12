import { getClient } from '@/services/sanity/client';
import {
  tryType,
  typeBooleanOrNull,
  typeImage,
  typeStringOrNull,
} from '@/services/sanity/type-utils';
import { logError } from '@/util/logger';
import { isNumber } from '@/util/type-guards';

import type { ContentForNewsItem } from '@/services/sanity/api/get-news-item';

export type ContentForNewsList = ContentForNewsItem[];

function isContentForNewsList(data: unknown): data is ContentForNewsList {
  return tryType('ContentForNews', data, [
    'array',
    {
      id: typeStringOrNull,
      title: typeStringOrNull,
      content: typeStringOrNull,
      category: typeStringOrNull,
      cardSize: typeStringOrNull,
      isEPFL: typeBooleanOrNull,
      slug: typeStringOrNull,
      date: typeStringOrNull,
      isExternalLink: typeBooleanOrNull,
      ...typeImage,
    },
  ]);
}

function sanitize(data: ContentForNewsList): ContentForNewsList {
  return data.map((item) => ({
    ...item,
    cardSize: item.cardSize || 'medium',
    category: item.category || 'platform-update',
  }));
}

const NEWS_PROJECTION = `{
  "id": _id,
  title,
  "content": thumbnailIntroduction,
  "isEPFL": isBBPEPFLNews,
  "slug": slug.current,
  "link": externalLink,
  category,
  cardSize,
  "imageURL": thumbnailImage.asset->url,
  "imageWidth": thumbnailImage.asset->metadata.dimensions.width,
  "imageHeight": thumbnailImage.asset->metadata.dimensions.height,
  "date": customDate,
  "isExternalLink": isExternalLink
}`;

export async function getNewsList(length = 0, start = 0): Promise<ContentForNewsList> {
  try {
    const range = length > 0 ? `[${start}..${length - 1}]` : '';
    const data = await getClient().fetch(
      `*[_type=="news"] | order(customDate desc) ${range} ${NEWS_PROJECTION}`
    );
    if (isContentForNewsList(data)) return sanitize(data);
  } catch (ex) {
    logError('Error fetching news list:', ex);
  }
  return [];
}

export async function getNewsPage(start: number, pageSize: number): Promise<ContentForNewsList> {
  try {
    const data = await getClient().fetch(
      `*[_type=="news"] | order(customDate desc) [${start}..${start + pageSize - 1}] ${NEWS_PROJECTION}`
    );
    if (isContentForNewsList(data)) return sanitize(data);
  } catch (ex) {
    logError('Error fetching news page:', ex);
  }
  return [];
}

export async function getNewsCount(): Promise<number> {
  try {
    const data = await getClient().fetch(`count(*[_type=="news"])`);
    if (isNumber(data)) return data;
  } catch (ex) {
    logError('Error fetching news count:', ex);
  }
  return 0;
}
