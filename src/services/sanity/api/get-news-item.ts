import { getClient } from '@/services/sanity/client';
import {
  tryType,
  typeBooleanOrNull,
  typeImage,
  typeStringOrNull,
} from '@/services/sanity/type-utils';
import { logError } from '@/utils/logger';

import type { PortableTextBlock } from '@portabletext/react';
import type { ContentForRichText } from '@/services/sanity/types/rtf-content';

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

export async function getNewsItem(slug: string): Promise<ContentForNewsItem | null> {
  try {
    const data = await getClient().fetch(
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
      }`
    );
    if (isContentForNewsItem(data)) return data;
  } catch (ex) {
    logError('Error fetching news item:', ex);
  }
  return null;
}
