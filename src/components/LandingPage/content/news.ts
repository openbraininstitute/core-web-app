/* eslint-disable no-param-reassign */
import { RichText, tryType, typeImage } from './_common';
import { useSanity } from './content';
import { typeStringOrNull } from './types';

export interface ContentForNewsItem {
  id: string;
  title: string;
  content: string;
  article: RichText | string | null;
  category: string;
  cardSize: string;
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
      id: 'string',
      title: 'string',
      content: 'string',
      category: typeStringOrNull,
      cardSize: typeStringOrNull,
      slug: 'string',
      date: 'string',
      ...typeImage,
    },
  ]);
}

function isContentForNewsItem(data: unknown): data is ContentForNewsItem {
  return tryType('ContentForNews', data, {
    id: 'string',
    title: 'string',
    content: 'string',
    category: typeStringOrNull,
    cardSize: typeStringOrNull,
    slug: 'string',
    date: 'string',
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
  category,
  cardSize,
  "imageURL": thumbnailImage.asset->url,
  "imageWidth": thumbnailImage.asset->metadata.dimensions.width,
  "imageHeight": thumbnailImage.asset->metadata.dimensions.height,
  "date": _createdAt,
}`,
      isContentForNewsItem
    ) ?? null
  );
}

export function useSanityContentForNewsList(): ContentForNewsList {
  return sanitize(
    useSanity(
      `*[_type=="news"] | order(_createdAt desc) {
  "id": _id,
  title,
  "content": thumbnailIntroduction,
  "slug": slug.current,
  category,
  cardSize,
  "imageURL": thumbnailImage.asset->url,
  "imageWidth": thumbnailImage.asset->metadata.dimensions.width,
  "imageHeight": thumbnailImage.asset->metadata.dimensions.height,
  "date": _createdAt,
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
