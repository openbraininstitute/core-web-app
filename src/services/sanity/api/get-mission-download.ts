import { getClient } from '@/services/sanity/client';
import { tryType, typeImage } from '@/services/sanity/type-utils';
import { logError } from '@/util/logger';

import type { RichText } from '@/services/sanity/type-utils';

export interface ContentForMissionDownload {
  title: string;
  description: RichText;
  documentURL: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

const DEFAULT: ContentForMissionDownload = {
  title: '',
  description: [],
  documentURL: '',
  imageURL: '',
  imageWidth: 0,
  imageHeight: 0,
};

function isContentForMissionDownload(data: unknown): data is ContentForMissionDownload {
  return tryType('ContentForOurMissionDownload', data, {
    title: 'string',
    description: 'unknown',
    ...typeImage,
  });
}

export async function getMissionDownload(): Promise<ContentForMissionDownload> {
  try {
    const data = await getClient().fetch(
      `*[_type=="downloadButton"][0]{
  title,
  description,
  "documentURL": document.asset->url,
  "imageURL": image.asset->url,
  "imageWidth": image.asset->metadata.dimensions.width,
  "imageHeight": image.asset->metadata.dimensions.height,
}`
    );
    if (isContentForMissionDownload(data)) return data;
  } catch (ex) {
    logError('Error fetching mission download:', ex);
  }
  return DEFAULT;
}
