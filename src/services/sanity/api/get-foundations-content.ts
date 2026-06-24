import { getClient } from '@/services/sanity/client';
import { tryType } from '@/services/sanity/type-utils';
import { logError } from '@/utils/logger';

import type { RichText } from '@/services/sanity/type-utils';

export interface ContentForFoundationsText {
  title: string | null;
  subtitle: string | null;
  videoURL: string;
  description: RichText;
}

function isContentForFoundationsText(data: unknown): data is ContentForFoundationsText {
  return tryType('ContentForOurFoundationsText', data, {
    title: ['|', 'string', 'null'],
    subtitle: ['|', 'string', 'null'],
    videoURL: 'string',
    description: 'unknown',
  });
}

export interface ContentForFoundationsLink {
  label: string;
  sublabel: string;
  url: string;
}

function isContentForFoundationsLinks(data: unknown): data is ContentForFoundationsLink[] {
  return tryType('ContentForOurFoundationsLinks', data, [
    'array',
    {
      label: 'string',
      sublabel: 'string',
      url: 'string',
    },
  ]);
}

const DEFAULT_FOUNDATIONS_TEXT: ContentForFoundationsText = {
  title: '',
  subtitle: '',
  videoURL: '',
  description: [],
};

export async function getFoundationsText(): Promise<ContentForFoundationsText> {
  try {
    const data = await getClient().fetch(
      `*[_type=="highlight"][0]{
  title,
  subtitle,
  description,
  "videoURL": video
}`
    );
    if (isContentForFoundationsText(data)) return data;
  } catch (ex) {
    logError('Error fetching foundations text:', ex);
  }
  return DEFAULT_FOUNDATIONS_TEXT;
}

export async function getFoundationsLinks(): Promise<ContentForFoundationsLink[]> {
  try {
    const data = await getClient().fetch(
      `*[_type=="highlight"][0].linkList[]{
  label,
  sublabel,
  url
}`
    );
    if (isContentForFoundationsLinks(data)) return data;
  } catch (ex) {
    logError('Error fetching foundations links:', ex);
  }
  return [];
}
