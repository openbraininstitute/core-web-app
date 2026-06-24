import { getClient } from '@/services/sanity/client';
import { tryType } from '@/services/sanity/type-utils';
import { logError } from '@/utils/logger';

import type { RichText } from '@/services/sanity/type-utils';

export interface ContentForWidgetHero {
  title: string;
  text: RichText | string;
  background: null | {
    url: string;
    width: number;
    height: number;
  };
  button: null | {
    label: string;
    link: string;
  };
}

function isContentForWidgetHero(data: unknown): data is ContentForWidgetHero {
  return tryType('ContentForHero', data, {
    title: 'string',
    background: [
      '|',
      'null',
      {
        url: 'string',
        width: 'number',
        height: 'number',
      },
    ],
    button: ['|', 'null', { label: 'string', link: 'string' }],
  });
}

export async function getWidgetHero(): Promise<ContentForWidgetHero | null> {
  try {
    const data = await getClient().fetch(
      `*[_type=="heroContent"][0]{
  title,
  text,
  "background": {
    "url": backgroundImage.asset->url,
    "width": backgroundImage.asset->metadata.dimensions.width,
    "height": backgroundImage.asset->metadata.dimensions.height
  },
  "button": {
    "label": buttonLabel,
    "link": internalLink->slug.current
  }
}`
    );
    if (isContentForWidgetHero(data)) return data;
  } catch (ex) {
    logError('Error fetching widget hero:', ex);
  }
  return null;
}
