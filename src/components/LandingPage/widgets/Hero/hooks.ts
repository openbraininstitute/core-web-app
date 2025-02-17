import { useSanity } from '../../content/content';
import { RichText, tryType } from '../../content/_common';

export function useContentForHero() {
  const query = `*[_type=="heroContent"][0]
{
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
}`;
  return useSanity(query, isContentForHero) ?? null;
}

interface ContentForHero {
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

function isContentForHero(data: unknown): data is ContentForHero {
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
