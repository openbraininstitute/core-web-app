import { useSanityContent } from './content';
import { assertType } from '@/util/type-guards';

export interface ContentForNewsItem {
  title: string;
  content: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
  date: string;
}

export type ContentForNews = ContentForNewsItem[];

function isContentForNews(data: unknown): data is ContentForNews {
  try {
    assertType(data, [
      'array',
      {
        title: 'string',
        content: 'string',
        imageURL: 'string',
        imageWidth: 'number',
        imageHeight: 'number',
        date: 'string',
      },
    ]);
    return true;
  } catch (ex) {
    // eslint-disable-next-line no-console
    console.debug(data);
    // eslint-disable-next-line no-console
    console.error(`Invalid ContentForHero data!`, ex);
    return false;
  }
}

export function useSanityContentForNews(): ContentForNews {
  const data = useSanityContent(`*[_type=="news"]{
  title,
  "content": thumbnailIntroduction,
  "imageURL": thumbnailImage.asset->url,
  "imageWidth": thumbnailImage.asset->metadata.dimensions.width,
  "imageHeight": thumbnailImage.asset->metadata.dimensions.height,
  "date": _createdAt,
}`);
  return isContentForNews(data) ? data : [];
}
