import query from '../query/featuresItemHooks.groq';

import { useSanity } from '@/services/sanity';
import { logError } from '@/util/logger';
import { assertType, TypeDef } from '@/util/type-guards';

export function useSanityContentForFeatureItems() {
  return useSanity(query, isContentForFeatureItems) ?? [];
}

export type ContentForFeatureItem = {
  Feature_title: string;
  Description: string;
  Topic: string;
  Scale: string;
  Status: string;
};

function isContentForFeatureItems(data: unknown): data is ContentForFeatureItem[] {
  const typeStringOrNull: TypeDef = ['|', 'string', 'null'];
  try {
    assertType(
      data,
      [
        'array',
        {
          Feature_title: typeStringOrNull,
          Description: typeStringOrNull,
          Topic: typeStringOrNull,
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
