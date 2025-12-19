import { useSanity } from '@/services/sanity/hooks';
import { logError } from '@/util/logger';
import { assertType, type TypeDef } from '@/util/type-guards';
import type { ContentForTutorialItem } from '../documentation/type';
import query from './hooks.groq';

export function useSanityContentForTutorialsList() {
  return useSanity(query, isContentForTutorialsList) ?? null;
}

function isContentForTutorialsList(data: unknown): data is ContentForTutorialItem {
  const typeStringOrNull: TypeDef = ['|', 'string', 'null'];
  try {
    assertType(
      data,
      {
        tutorialOrder: [
          'array',
          {
            title: typeStringOrNull,
            description: typeStringOrNull,
            slug: 'string',
            url: typeStringOrNull,
            imageURL: 'string',
            imageWidth: 'number',
            imageHeight: 'number',
          },
        ],
      },
      'ContentForTutorialItem',
    );

    return true;
  } catch (err) {
    logError(err);
    return false;
  }
}
