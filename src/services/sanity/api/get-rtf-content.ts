import { getClient } from '@/services/sanity/client';
import { isContentForRichText } from '@/services/sanity/types/rtf-content';
import { getSanityPagesSlugPredicate } from '@/ui/segments/landing/utils';
import { logError } from '@/utils/logger';

import type { ContentForRichText } from '@/services/sanity/types/rtf-content';

const QUERY = `*[_type=="pages"][<SLUG_PRED>][0]{
  content[] {
    ...,
    backgroundColor,
    theme,
    "backgroundImage": backgroundImage.asset->url,
    buttonsList[] {
      title,
      "href": file.asset->url,
      'backgroundURL': backgroundImage.asset->url,
      'backgroundWidth': backgroundImage.asset->metadata.dimensions.width,
      'backgroundHeight': backgroundImage.asset->metadata.dimensions.height,
    },
    timestamps[] {
      label,
      description,
      timestamp,
    },
    "image": image.asset->{
      url,
      "width": metadata.dimensions.width,
      "height": metadata.dimensions.height,
    },
    "background": backgroundImage.asset->{
      url,
      "width": metadata.dimensions.width,
      "height": metadata.dimensions.height,
    },
    "button": {
      "label": buttonLabel,
      "link": internalLink->slug.current
    },
    content[] {
      ...,
      'imageURL': image.asset->url,
      'imageWidth': image.asset->metadata.dimensions.width,
      'imageHeight': image.asset->metadata.dimensions.height,
    }
  }
}.content`;

export async function getRTFContent(slug: string): Promise<ContentForRichText> {
  try {
    const query = QUERY.replaceAll('<SLUG_PRED>', getSanityPagesSlugPredicate(slug));
    const data = await getClient().fetch(query);
    if (isContentForRichText(data)) return data;
  } catch (ex) {
    logError('Error fetching RTF content:', ex);
  }
  return [];
}
