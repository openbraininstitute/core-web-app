import { useSanity } from '@/services/sanity';
import { tryType, typeImage } from '@/services/sanity/type-utils';

import type { RichText } from '@/services/sanity/type-utils';

export function useSanityContentForMultipleMember() {
  return (
    useSanity(
      `*[_type=="multipleMemberBloc"].memberList[]->{
  firstName,
  lastName,
  "biography": shortBiography,
  "imageURL": image.asset->url,
  "imageWidth": image.asset->metadata.dimensions.width,
  "imageHeight": image.asset->metadata.dimensions.height
}`,
      isContentForMultipleMember
    ) ?? []
  );
}

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
