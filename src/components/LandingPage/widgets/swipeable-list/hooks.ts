import { useSanity } from '@/services/sanity/hooks';
import { tryType, typeStringOrNull } from '../../content';
import query from './hooks.groq';

export function useSanityContentForSwipeableList() {
  return useSanity(query, isContentForSwipeableList);
}

interface ContentForSwipeableList {
  title: string;
  button: string;
  link: string;
  list: ContentForSwipeableListItem[];
}

export interface ContentForSwipeableListItem {
  title: string;
  subtitle: string;
  text: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

function isContentForSwipeableList(data: unknown): data is ContentForSwipeableList {
  return tryType('ContentForSwipeableList', data, {
    title: typeStringOrNull,
    button: typeStringOrNull,
    link: typeStringOrNull,
    list: [
      'array',
      {
        title: typeStringOrNull,
        subtitle: typeStringOrNull,
        text: typeStringOrNull,
        imageURL: typeStringOrNull,
        imageWidth: 'number',
        imageHeight: 'number',
      },
    ],
  });
}
