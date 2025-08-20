import { z } from 'zod';

import queryForArtifactTypes from '@/components/documentation/query/experimental-types-query';
import { useSanity } from '@/services/sanity';
import { ContentForGlossaryItem } from '@/types/help/type';
import { logError } from '@/util/logger';

const ContentForGlossaryItemSchema = z.object({
  Name: z.string().nullable(),
  New_suggested_name: z.string().nullable(),
  Description: z.string().nullable(),
  definition: z.unknown(),
  Data_Type: z.string().nullable(),
  Scale: z.string().nullable(),
  Status: z.string().nullable(),
});

const ContentForGlossarySchema = z.array(ContentForGlossaryItemSchema);

export function useSanityContentForArtifactTypes() {
  return useSanity(queryForArtifactTypes, isContentForGlossary) ?? [];
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
