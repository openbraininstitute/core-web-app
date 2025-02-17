import { RichText, tryType, typeImage } from '../../content/_common';
import { useSanity } from '../../content/content';

export interface ContentForOurMissionDownload {
  title: string;
  description: RichText;
  documentURL: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

const DEFAULT: ContentForOurMissionDownload = {
  title: '',
  description: [],
  documentURL: '',
  imageURL: '',
  imageWidth: 0,
  imageHeight: 0,
};

function isContentForOurMissionDownload(data: unknown): data is ContentForOurMissionDownload {
  return tryType('ContentForOurMissionDownload', data, {
    title: 'string',
    description: 'unknown',
    ...typeImage,
  });
}

export function useSanityContentForOurMissionDownload() {
  return (
    useSanity(
      `*[_type=="downloadButton"][0]
{
  title,
  description,
  "documentURL": document.asset->url,
  "imageURL": image.asset->url,
  "imageWidth": image.asset->metadata.dimensions.width,
  "imageHeight": image.asset->metadata.dimensions.height,
}
`,
      isContentForOurMissionDownload
    ) ?? DEFAULT
  );
}
