import { ContentForTutorialItem } from '../documentation/type';

import query from './hooks.groq';

import { useSanity } from '@/services/sanity';
import { logError } from '@/util/logger';
import { assertType, TypeDef } from '@/util/type-guards';

export function useSanityContentForTutorialsList() {
  return useSanity(query, isContentForTutorialsList) ?? [];
}

function isContentForTutorialsList(data: unknown): data is ContentForTutorialItem[] {
  const typeStringOrNull: TypeDef = ['|', 'string', 'null'];
  try {
    assertType(
      data,
      [
        'array',
        {
          url: 'string',
          title: typeStringOrNull,
          slug: 'string',
          description: typeStringOrNull,
          imageURL: 'string',
          imageWidth: 'number',
          imageHeight: 'number',
        },
      ],
      'ContentForTutorialsList'
    );
    return true;
  } catch (ex) {
    logError(ex);
    return false;
  }
}
