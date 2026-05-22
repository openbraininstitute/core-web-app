import { getClient } from '@/services/sanity/client';
import { tryType, typeImage } from '@/services/sanity/type-utils';
import { logError } from '@/utils/logger';

export interface ContentForMember {
  firstName: string;
  lastName: string;
  group: 'team' | 'board' | 'executiveBoard';
  role: string;
  order: number | null;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

function isContentForMembers(data: unknown): data is ContentForMember[] {
  return tryType('ContentForMembers', data, [
    'array',
    {
      firstName: 'string',
      lastName: 'string',
      group: ['literal', 'team', 'board', 'executiveBoard'],
      role: 'string',
      order: ['|', 'null', 'number'],
      ...typeImage,
    },
  ]);
}

export async function getMembers(): Promise<ContentForMember[]> {
  try {
    const data = await getClient().fetch(
      `*[_type=="member"]{
  firstName,
  lastName,
  group,
  role,
  "order": tableOrder,
  "imageURL": image.asset->url,
  "imageWidth": image.asset->metadata.dimensions.width,
  "imageHeight": image.asset->metadata.dimensions.height,
}`
    );
    if (isContentForMembers(data)) return data;
  } catch (ex) {
    logError('Error fetching members:', ex);
  }
  return [];
}
