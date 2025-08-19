import { z } from 'zod';

import query from '@/components/documentation/query/features-item-hooks.groq';
import { useSanity } from '@/services/sanity';
import { logError } from '@/util/logger';

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

const ContentForFeatureItemSchema = z.object({
  Feature_title: z.string().nullable(),
  Description: z.string().nullable(),
  Topic: z.string().nullable(),
  Scale: z.string().nullable(),
  Status: z.string().nullable(),
});

const ContentForFeatureItemsSchema = z.array(ContentForFeatureItemSchema);

function isContentForFeatureItems(data: unknown): data is ContentForFeatureItem[] {
  try {
    ContentForFeatureItemsSchema.parse(data);
    return true;
  } catch (ex) {
    logError(ex);
    return false;
  }
}
