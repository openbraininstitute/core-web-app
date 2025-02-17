import { useSanity } from './content';
import { tryType, typeImage } from './_common';

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

export function useSanityContentForMembers() {
  return (
    useSanity(
      `*[_type=="member"]{
  firstName,
  lastName,
  group,
  role,
  "order": tableOrder,
  "imageURL": image.asset->url,
  "imageWidth": image.asset->metadata.dimensions.width,
  "imageHeight": image.asset->metadata.dimensions.height,
}
  `,
      isContentForMembers
    ) ?? []
  );
}
