import { tryType, typeStringOrNull } from '../../content';
import { typeImage } from '../../content/_common';
import { useSanity } from '../../content/content';
import query from './hooks.groq';

export function useSanityContentForRepositories() {
  return useSanity(query, isContentForRepositories) ?? [];
}

export interface ContentForRepository {
  type: string;
  title: string;
  author: string;
  description: string;
  url: string;
  buttons: Array<{
    title: string;
    link: string;
  }>;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

function isContentForRepositories(data: unknown): data is ContentForRepository[] {
  return tryType('ContentForRepositories', data, [
    'array',
    {
      type: typeStringOrNull,
      title: typeStringOrNull,
      author: typeStringOrNull,
      description: typeStringOrNull,
      url: typeStringOrNull,
      buttons: [
        'array',
        {
          title: typeStringOrNull,
          link: typeStringOrNull,
        },
      ],
      ...typeImage,
    },
  ]);
}
