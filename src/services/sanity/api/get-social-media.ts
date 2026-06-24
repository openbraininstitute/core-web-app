import { getClient } from '@/services/sanity/client';
import { tryType, typeImage, typeStringOrNull } from '@/services/sanity/type-utils';
import { logError } from '@/utils/logger';

export interface ContentForSocialMediaLink {
  url: string;
  title: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

function isContentForSocialMediaLinks(data: unknown): data is ContentForSocialMediaLink[] {
  return tryType('ContentForSocialMediaLinks', data, [
    'array',
    {
      url: 'string',
      title: typeStringOrNull,
      ...typeImage,
    },
  ]);
}

export async function getSocialMediaLinks(): Promise<ContentForSocialMediaLink[]> {
  try {
    const data = await getClient().fetch(
      `*[_type=="footer"][0]
.socialMediaList[_type=="socialMediaItem"]{
  title,
  url,
  "imageURL": icon.asset->url,
  "imageWidth": icon.asset->metadata.dimensions.width,
  "imageHeight": icon.asset->metadata.dimensions.height
}`
    );
    if (isContentForSocialMediaLinks(data)) return data;
  } catch (ex) {
    logError('Error fetching social media links:', ex);
  }
  return [];
}
