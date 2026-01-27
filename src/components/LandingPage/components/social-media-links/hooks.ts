import { useSanity } from '@/services/sanity';
import { tryType, typeStringOrNull } from '../../content';
import { typeImage } from '../../content/_common';
import query from './hooks.groq';

export function useSanityContentForSocialMediaLinks() {
  return useSanity(query, isContentForSocialMediaLinks) ?? [];
}

interface ContentForSocialMediaLink {
  url: string;
  title: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

function isContentForSocialMediaLinks(data: unknown): data is ContentForSocialMediaLink[] {
  return tryType('ContentForSocialMediaLinks', data, [
    'array',
    {
      url: 'string',
      title: typeStringOrNull,
      ...typeImage,
    },
  ]);
}
