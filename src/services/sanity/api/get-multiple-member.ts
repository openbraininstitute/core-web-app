import { getClient } from '@/services/sanity/client';
import { tryType, typeImage } from '@/services/sanity/type-utils';
import { logError } from '@/utils/logger';

import type { RichText } from '@/services/sanity/type-utils';

export interface ContentForMultipleMemberItem {
  firstName: string;
  lastName: string;
  biography: string | RichText;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

function isContentForMultipleMember(data: unknown): data is ContentForMultipleMemberItem[] {
  return tryType('ContentForMultipleMember', data, [
    'array',
    {
      lastName: 'string',
      firstName: 'string',
      ...typeImage,
    },
  ]);
}

export async function getMultipleMember(): Promise<ContentForMultipleMemberItem[]> {
  try {
    const data = await getClient().fetch(
      `*[_type=="multipleMemberBloc"].memberList[]->{
  firstName,
  lastName,
  "biography": shortBiography,
  "imageURL": image.asset->url,
  "imageWidth": image.asset->metadata.dimensions.width,
  "imageHeight": image.asset->metadata.dimensions.height
}`
    );
    if (isContentForMultipleMember(data)) return data;
  } catch (ex) {
    logError('Error fetching multiple member:', ex);
  }
  return [];
}
