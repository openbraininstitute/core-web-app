import { useSanity } from '@/services/sanity';
import { assertType, type TypeDef } from '@/util/type-guards';
import { logError } from '@/utils/logger';

import queryForArtifactTypes from '../query/experimental-types-query';

import type { ContentForGlossaryItem } from '../type';

export function useSanityContentForArtifactTypes() {
  return useSanity(queryForArtifactTypes, isContentForGlossary) ?? [];
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
          definition: 'unknown',
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
