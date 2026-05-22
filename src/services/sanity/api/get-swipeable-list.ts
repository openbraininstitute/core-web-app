import { getClient } from '@/services/sanity/client';
import { tryType, typeStringOrNull } from '@/services/sanity/type-utils';
import { logError } from '@/utils/logger';

export interface ContentForSwipeableListItem {
  title: string;
  subtitle: string;
  text: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

export interface ContentForSwipeableList {
  title: string;
  button: string;
  link: string;
  list: ContentForSwipeableListItem[];
}

function isContentForSwipeableList(data: unknown): data is ContentForSwipeableList {
  return tryType('ContentForSwipeableList', data, {
    title: typeStringOrNull,
    button: typeStringOrNull,
    link: typeStringOrNull,
    list: [
      'array',
      {
        title: typeStringOrNull,
        subtitle: typeStringOrNull,
        text: typeStringOrNull,
        imageURL: typeStringOrNull,
        imageWidth: 'number',
        imageHeight: 'number',
      },
    ],
  });
}

export async function getSwipeableList(): Promise<ContentForSwipeableList | null> {
  try {
    const data = await getClient().fetch(
      `*[_type=="swipeableList"][0]{
  title,
  "button": buttonLabel,
  "link": internalLink->slug.current,
  "list": mediumItemList[] {
    title,
    subtitle,
    "text": paragraph,
    "imageURL": image.asset->url,
    "imageWidth": image.asset->metadata.dimensions.width,
    "imageHeight": image.asset->metadata.dimensions.height
  }
}`
    );
    if (isContentForSwipeableList(data)) return data;
  } catch (ex) {
    logError('Error fetching swipeable list:', ex);
  }
  return null;
}
