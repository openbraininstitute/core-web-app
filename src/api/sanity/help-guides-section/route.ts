import { z } from 'zod';
import { PortableTextBlock } from '@sanity/types';

import { client } from '@/api/sanity/client';
import { logError } from '@/util/logger';

export type GuideCardProps = {
  title: string;
  slug: {
    current: string;
  };
  topic: string;
  scale: string;
  content: PortableTextBlock;
};

const queryForGuidesContent = `*[_type=="guides"]{
  title, 
  slug,
  topic,
  scale,
  content
}`;

// Schema for a single guide item
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

// Schema for the array of guides
const GuidesContentsSchema = z.array(GuideItemSchema);

export type GuideItem = z.infer<typeof GuideItemSchema>;
export type GuidesContentsProps = z.infer<typeof GuidesContentsSchema>;

function isContentForGuides(data: unknown): data is GuidesContentsProps {
  try {
    // Handle null/undefined case
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
    const data = await client.fetch<GuidesContentsProps>({
      query: queryForGuidesContent,
    });
    if (isContentForGuides(data)) return data;
  } catch (err) {
    logError(err);
  }
  return [];
}
