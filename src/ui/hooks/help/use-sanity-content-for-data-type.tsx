import queryForDataTypes from '@/components/documentation/query/data-types-query';
import { useSanity } from '@/services/sanity';
import { ContentForGlossaryItem } from '@/types/help/type';
import { logError } from '@/util/logger';
import { assertType, TypeDef } from '@/util/type-guards';

export function useSanityContentForExperimentsModels() {
  return useSanity(queryForDataTypes, isContentForGlossary) ?? [];
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
