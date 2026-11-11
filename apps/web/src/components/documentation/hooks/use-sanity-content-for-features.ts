import { z } from 'zod';

import query from '@/components/documentation/query/features-item-hooks.groq';
import { useSanity } from '@/services/sanity';
import { logError } from '@/utils/logger';

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

// Zod schema for ContentForFeatureItem
const ContentForFeatureItemSchema = z.object({
  Feature_title: z.string().nullable(),
  Description: z.string().nullable(),
  Topic: z.string().nullable(),
  Scale: z.string().nullable(),
  Status: z.string().nullable(),
});

// Zod schema for array of ContentForFeatureItem
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
