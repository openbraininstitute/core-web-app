import { z } from 'zod';

import queryForDataTypes from '@/components/documentation/query/data-types-query';
import { useSanity } from '@/services/sanity';
import { ContentForGlossaryItem } from '@/types/help/type';
import { logError } from '@/util/logger';

// Zod schema for ContentForGlossaryItem
const ContentForGlossaryItemSchema = z.object({
  Name: z.string().nullable(),
  New_suggested_name: z.string().nullable(),
  Description: z.string().nullable(),
  definition: z.unknown(),
  Data_Type: z.string().nullable(),
  Scale: z.string().nullable(),
  Status: z.string().nullable(),
});

// Zod schema for array of ContentForGlossaryItem
const ContentForGlossarySchema = z.array(ContentForGlossaryItemSchema);

export function useSanityContentForExperimentsModels() {
  return useSanity(queryForDataTypes, isContentForGlossary) ?? [];
}

function isContentForGlossary(data: unknown): data is ContentForGlossaryItem[] {
  try {
    ContentForGlossarySchema.parse(data);
    return true;
  } catch (ex) {
    logError(ex);
    return false;
  }
}
