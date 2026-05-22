import { getClient } from '@/services/sanity/client';
import { tryType } from '@/services/sanity/type-utils';
import { isString } from '@/util/type-guards';
import { logError } from '@/utils/logger';

export interface ContentForPortalsListItem {
  title: string;
  description: string;
  link: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

function isStringOrNull(data: unknown): data is string | null {
  if (data === null) return true;
  return isString(data);
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

export async function getPortalsTitle(): Promise<string> {
  try {
    const data = await getClient().fetch(
      `*[_type=="pages" && slug.current=="home"][0].content[_type=="portalsList"][0].title`
    );
    if (isStringOrNull(data)) return data ?? '';
  } catch (ex) {
    logError('Error fetching portals title:', ex);
  }
  return '';
}

export async function getPortalsList(): Promise<ContentForPortalsListItem[]> {
  try {
    const data = await getClient().fetch(
      `*[_type=="portalGrid"][0].portals[]{
  title,
  description,
  "link": url,
  "imageURL": image.asset->url,
  "imageWidth": image.asset->metadata.dimensions.width,
  "imageHeight": image.asset->metadata.dimensions.height,
}`
    );
    if (isContentForPortalList(data)) return data;
  } catch (ex) {
    logError('Error fetching portals list:', ex);
  }
  return [];
}
