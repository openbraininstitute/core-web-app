import { getClient } from '@/services/sanity/client';
import { tryType, typeImage, typeStringOrNull } from '@/services/sanity/type-utils';
import { logError } from '@/util/logger';

export interface ContentForRepository {
  type: string;
  title: string;
  author: string;
  description: string;
  url: string;
  buttons: Array<{
    title: string;
    link: string;
  }>;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

function isContentForRepositories(data: unknown): data is ContentForRepository[] {
  return tryType('ContentForRepositories', data, [
    'array',
    {
      type: typeStringOrNull,
      title: typeStringOrNull,
      author: typeStringOrNull,
      description: typeStringOrNull,
      url: typeStringOrNull,
      buttons: [
        'array',
        {
          title: typeStringOrNull,
          link: typeStringOrNull,
        },
      ],
      ...typeImage,
    },
  ]);
}

export async function getRepositoriesContent(): Promise<ContentForRepository[]> {
  try {
    const data = await getClient().fetch(
      `*[_type=="resourcesList"][0].resources[]-> {
  "type": objectOfStudy,
  title,
  author,
  description,
  url,
  "buttons": buttonList[] {
    title,
    "link": externalLink
  },
  "imageURL": image.asset->url,
  "imageWidth": image.asset->metadata.dimensions.width,
  "imageHeight": image.asset->metadata.dimensions.height
}`
    );
    if (isContentForRepositories(data)) return data;
  } catch (ex) {
    logError('Error fetching repositories content:', ex);
  }
  return [];
}
