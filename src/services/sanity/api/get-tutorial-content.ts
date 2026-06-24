import { getClient } from '@/services/sanity/client';
import tutorialQuery from '@/services/sanity/queries/help-tutorial';
import { assertType, type TypeDef } from '@/util/type-guards';
import { logError } from '@/utils/logger';

import type { ContentForTutorialItem } from '@/types/help/type';

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
      'ContentForTutorial'
    );
    return true;
  } catch (ex) {
    logError(ex);
    return false;
  }
}

export async function getTutorialContent(): Promise<ContentForTutorialItem> {
  try {
    const data = await getClient().fetch<ContentForTutorialItem>(tutorialQuery);
    if (isContentForTutorials(data)) return data;
  } catch (err) {
    logError(err);
  }

  return {
    tutorialOrder: [],
  };
}
