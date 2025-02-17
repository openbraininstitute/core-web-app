import { useSanity } from './content';
import { tryType } from './_common';
import { isString } from '@/util/type-guards';

export function useSanityContentForPortalsTitle(): string {
  return (
    useSanity(
      `*[_type=="pages" && slug.current=="home"][0].content[_type=="portalsList"][0].title`,
      isString
    ) ?? ''
  );
}

export interface ContentForPortalsListItem {
  title: string;
  description: string;
  link: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

function isContentForPortalList(data: unknown): data is ContentForPortalsListItem[] {
  return tryType('ContentForPortals', data, [
    'array',
    {
      title: 'string',
      description: 'string',
      link: 'string',
      imageURL: 'string',
      imageWidth: 'number',
      imageHeight: 'number',
    },
  ]);
}

export function useSanityContentForPortalsList(): ContentForPortalsListItem[] {
  return (
    useSanity(
      `*[_type=="portalGrid"][0].portals[]
{
  title,
  description,
  "link": url,
  "imageURL": image.asset->url,
  "imageWidth": image.asset->metadata.dimensions.width,
  "imageHeight": image.asset->metadata.dimensions.height,
}
`,
      isContentForPortalList
    ) ?? []
  );
}
