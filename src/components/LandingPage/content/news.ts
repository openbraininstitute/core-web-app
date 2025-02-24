/* eslint-disable no-param-reassign */
import { tryType, typeImage } from './_common';
import { useSanity } from './content';
import { ContentForRichText, typeBooleanOrNull, typeStringOrNull } from './types';
import { isNumber } from '@/util/type-guards';

export interface ContentForNewsItem {
  id: string;
  title: string;
  content: string;
  article?: ContentForRichText | null;
  category: string;
  cardSize: string;
  isEPFL: boolean;
  link: string | null;
  slug: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
  date: string;
}

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
      ...typeImage,
    },
  ]);
}

function isContentForNewsItem(data: unknown): data is ContentForNewsItem {
  return tryType('ContentForNews', data, {
    id: typeStringOrNull,
    title: typeStringOrNull,
    category: typeStringOrNull,
    cardSize: typeStringOrNull,
    isEPFL: typeBooleanOrNull,
    slug: typeStringOrNull,
    date: typeStringOrNull,
    ...typeImage,
  });
}

export function useSanityContentForNewsItem(slug: string): ContentForNewsItem | null {
  return (
    useSanity(
      `*[_type=="news" && slug.current==${JSON.stringify(slug)}][0] {
  "id": _id,
  title,
  "content": thumbnailIntroduction,
  "article": content,
  "slug": slug.current,
  "isEPFL": isBBPEPFLNews,
  category,
  cardSize,
  "imageURL": thumbnailImage.asset->url,
  "imageWidth": thumbnailImage.asset->metadata.dimensions.width,
  "imageHeight": thumbnailImage.asset->metadata.dimensions.height,
  "date": customDate,
}`,
      isContentForNewsItem
    ) ?? null
  );
}

export function useSanityContentForNewsList(limit?: number): ContentForNewsList {
  return sanitize(
    useSanity(
      `*[_type=="news"] | order(customDate desc) ${isNumber(limit) ? `[0..${limit - 1}]` : ''} {
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
}`,
      isContentForNewsList
    ) ?? []
  );
}

function sanitize(data: ContentForNewsList): ContentForNewsList {
  return data.map((item) => {
    if (!item.cardSize) item.cardSize = 'medium';
    if (!item.category) item.category = 'platform-update';
    return item;
  });
}
