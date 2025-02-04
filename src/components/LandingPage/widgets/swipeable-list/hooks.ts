import { tryType, typeStringOrNull } from '../../content';
import { useSanity } from '../../content/content';

export function useSanityContentForSwipeableList() {
  return useSanity(
    `*[_type=="swipeableList"][0]
{
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
}`,
    isContentForSwipeableList
  );
}

export interface ContentForSwipeableList {
  title: string;
  button: string;
  link: string;
  list: ContentForSwipeableListItem[];
}

export interface ContentForSwipeableListItem {
  title: string;
  subtitle: string;
  text: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
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
