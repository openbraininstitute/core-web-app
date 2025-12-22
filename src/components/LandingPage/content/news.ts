/* eslint-disable no-param-reassign */
import type { PortableTextBlock } from 'next-sanity';
import { useSanity } from '@/services/sanity/hooks';
import { isNumber } from '@/util/type-guards';
import { tryType, typeImage } from './_common';
import { type ContentForRichText, typeBooleanOrNull, typeStringOrNull } from './types';

export interface ContentForNewsItem {
  id: string;
  title: string;
  articleContent: PortableTextBlock;
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
  thumbnailIntroduction?: string;
  isExternalLink: boolean;
}

export type ContentForNewsList = ContentForNewsItem[];

export function isContentForNewsList(data: unknown): data is ContentForNewsList {
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

function isContentForNewsItem(data: unknown): data is ContentForNewsItem {
  return tryType('ContentForNews', data, {
    id: typeStringOrNull,
    title: typeStringOrNull,
    category: typeStringOrNull,
    cardSize: typeStringOrNull,
    isEPFL: typeBooleanOrNull,
    slug: typeStringOrNull,
    date: typeStringOrNull,
    isExternalLink: typeBooleanOrNull,
    ...typeImage,
  });
}

export function useSanityContentForNewsItem(slug: string): ContentForNewsItem | null {
  return (
    useSanity(
      `*[_type=="news" && slug.current==${JSON.stringify(slug)}][0] {
        "id": _id,
        articleContent[] {
          ...,
          children[],
          "image": image.asset->url,
          "file": file.asset->url
        },
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
        thumbnailIntroduction,
        isExternalLink
      }`,
      isContentForNewsItem
    ) ?? null
  );
}

export function useSanityContentForNewsListCount(): number {
  return useSanity(`count(*[_type=="news"])`, isNumber) ?? 0;
}

export function useSanityContentForNewsList(length = 0, start = 0): ContentForNewsList {
  return sanitize(
    useSanity(
      `*[_type=="news"] | order(customDate desc) ${length > 0 ? `[${start}..${length - 1}]` : ''} {
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
