import query from './hooks.groq';
import { assertType, TypeDef } from '@/util/type-guards';
import { useSanity } from '@/services/sanity';
import { logError } from '@/util/logger';

export function useSanityContentForTutorialsList() {
  return useSanity(query, isContentForTutorialsList) ?? [];
}

export interface ContentForTutorialItem {
  url: string;
  title: string;
  description: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
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
