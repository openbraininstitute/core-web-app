import { z } from 'zod';

import { getClient } from '@/services/sanity/client';
import guidesQuery from '@/services/sanity/queries/help-guides';
import { logError } from '@/utils/logger';

import type { PortableTextBlock } from 'next-sanity';

export type GuideCardProps = {
  title: string;
  slug: {
    current: string;
  };
  topic: string;
  scale: string;
  content: PortableTextBlock;
};

const GuideItemSchema = z.object({
  title: z.string().nullable().optional(),
  slug: z
    .object({
      current: z.string(),
    })
    .nullable()
    .optional(),
  topic: z.string().nullable().optional(),
  scale: z.string().nullable().optional(),
  content: z.unknown().nullable().optional(),
});

const GuidesContentsSchema = z.array(GuideItemSchema);

export type GuideItem = z.infer<typeof GuideItemSchema>;
export type GuidesContentsProps = z.infer<typeof GuidesContentsSchema>;

function isContentForGuides(data: unknown): data is GuidesContentsProps {
  try {
    if (!data) return false;
    GuidesContentsSchema.parse(data);
    return true;
  } catch (ex) {
    logError(ex);
    return false;
  }
}

export async function getGuidesContent(): Promise<GuidesContentsProps> {
  try {
    const data = await getClient().fetch<GuidesContentsProps>(guidesQuery);
    if (isContentForGuides(data)) return data;
  } catch (err) {
    logError(err);
  }
  return [];
}
