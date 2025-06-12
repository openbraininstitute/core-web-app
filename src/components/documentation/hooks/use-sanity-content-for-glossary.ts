import query from '../query/glossaryHooks.groq';

import { useSanity } from '@/services/sanity';
import { logError } from '@/util/logger';
import { assertType, TypeDef } from '@/util/type-guards';

export function useSanityContentForGlossary() {
  return useSanity(query, isContentForGlossary) ?? [];
}

export interface ContentForGlossaryItem {
  Name: string;
  New_suggested_name: string;
  Description: string;
  Data_Type: string;
  Scale: string;
  Status: string;
}

function isContentForGlossary(data: unknown): data is ContentForGlossaryItem[] {
  const typeStringOrNull: TypeDef = ['|', 'string', 'null'];
  try {
    assertType(
      data,
      [
        'array',
        {
          Name: typeStringOrNull,
          New_suggested_name: typeStringOrNull,
          Description: typeStringOrNull,
          Data_Type: typeStringOrNull,
          Scale: typeStringOrNull,
          Status: typeStringOrNull,
        },
      ],
      'ContentForGlossary'
    );
    return true;
  } catch (ex) {
    logError(ex);
    return false;
  }
}
