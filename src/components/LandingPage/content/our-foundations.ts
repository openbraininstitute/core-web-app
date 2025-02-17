import { useSanity } from './content';
import { RichText, tryType } from './_common';

export interface ContentForOurFoundationsText {
  title: string | null;
  subtitle: string | null;
  videoURL: string;
  description: RichText;
}

function isContentForOurFoundationsText(data: unknown): data is ContentForOurFoundationsText {
  return tryType('ContentForOurFoundationsText', data, {
    title: ['|', 'string', 'null'],
    subtitle: ['|', 'string', 'null'],
    videoURL: 'string',
    description: 'unknown',
  });
}

export function useSanityContentForOurFoundationsText() {
  return (
    useSanity(
      `*[_type=="highlight"][0]
{
  title,
  subtitle,
  description,
  "videoURL": video
}`,
      isContentForOurFoundationsText
    ) ?? {
      title: '',
      subtitle: '',
      videoURL: '',
      description: [],
    }
  );
}

export interface ContentForOurFoundationsLink {
  label: string;
  sublabel: string;
  url: string;
}

function isContentForOurFoundationsLinks(data: unknown): data is ContentForOurFoundationsLink[] {
  return tryType('ContentForOurFoundationsLinks', data, [
    'array',
    {
      label: 'string',
      sublabel: 'string',
      url: 'string',
    },
  ]);
}

export function useSanityContentForOurFoundationsLinks() {
  return (
    useSanity(
      `*[_type=="highlight"][0].linkList[]
{
  label,
  sublabel,
  url
}
`,
      isContentForOurFoundationsLinks
    ) ?? []
  );
}
