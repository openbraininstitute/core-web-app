import { tryType, typeStringOrNull } from '../../content';
import { typeImage } from '../../content/_common';
import { useSanity } from '../../content/content';
import query from './hooks.groq';

export function useSanityContentForRepositories() {
  return useSanity(query, isContentForRepositories) ?? [];
}

export interface ContentForRepository {
  title: string;
  author: string;
  description: string;
  url: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

function isContentForRepositories(data: unknown): data is ContentForRepository[] {
  return tryType('ContentForRepositories', data, [
    'array',
    {
      title: typeStringOrNull,
      author: typeStringOrNull,
      description: typeStringOrNull,
      url: typeStringOrNull,
      ...typeImage,
    },
  ]);
}
