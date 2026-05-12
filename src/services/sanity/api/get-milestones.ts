import { getClient } from '@/services/sanity/client';
import { tryType, typeImage, typeStringOrNull } from '@/services/sanity/type-utils';
import { logError } from '@/util/logger';

export interface ContentForMilestoneItem {
  title: string;
  description: string;
  astrocytes: string | null;
  neurons: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

export type ContentForMilestones = ContentForMilestoneItem[];

function isContentForMilestones(data: unknown): data is ContentForMilestones {
  return tryType('ContentForMilestones', data, [
    'array',
    {
      title: 'string',
      description: 'string',
      astrocytes: typeStringOrNull,
      neurons: 'string',
      ...typeImage,
    },
  ]);
}

export async function getMilestones(): Promise<ContentForMilestones> {
  try {
    const data = await getClient().fetch(
      `*[_type=="milestone"] | order(date) {
  title,
  "description": introduction,
  "astrocytes": numberOfAstrocytes,
  "neurons": numerOfNeurons,
  "imageURL": image.asset->url,
  "imageWidth": image.asset->metadata.dimensions.width,
  "imageHeight": image.asset->metadata.dimensions.height,
}`
    );
    if (isContentForMilestones(data)) return data;
  } catch (ex) {
    logError('Error fetching milestones:', ex);
  }
  return [];
}
