import { getClient } from '@/api/sanity/client';
import type { ContentForTutorialItem } from '@/types/help/type';
import { logError } from '@/util/logger';
import { assertType, type TypeDef } from '@/util/type-guards';

const queryForAboutContent = `*[_type == "documentationSettings"][0] {
  tutorialOrder[]-> {
    title, 
    description,
    "slug": slug.current,
    "url": videoUrl,
    transcript,
    "imageURL": thumbnail.asset->url,
    "imageWidth": thumbnail.asset->metadata.dimensions.width,
    "imageHeight": thumbnail.asset->metadata.dimensions.height,
    steps
  }
}`;

function isContentForTutorials(data: unknown): data is ContentForTutorialItem {
  const typeStringOrNull: TypeDef = ['|', 'string', 'null'];
  try {
    assertType(
      data,
      {
        tutorialOrder: [
          'array',
          {
            title: typeStringOrNull,
            description: typeStringOrNull,
            slug: 'string',
            url: typeStringOrNull,
            imageURL: 'string',
            imageWidth: 'number',
            imageHeight: 'number',
          },
        ],
      },
      'ContentForTutorial',
    );
    return true;
  } catch (ex) {
    logError(ex);
    return false;
  }
}

export async function getTutorialContent(): Promise<ContentForTutorialItem> {
  try {
    const data = await getClient().fetch<ContentForTutorialItem>({
      query: queryForAboutContent,
    });
    if (isContentForTutorials(data)) return data;
  } catch (err) {
    logError(err);
  }

  return {
    tutorialOrder: [],
  };
}
