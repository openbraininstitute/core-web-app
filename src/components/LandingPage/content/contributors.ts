import { RichText, tryType } from './_common';
import { useSanity } from '@/services/sanity';

export interface ContentForContributors {
  title: string;
  description: RichText;
}

function isContentForContributors(data: unknown): data is ContentForContributors {
  return tryType('ContentForContributors', data, {
    title: 'string',
    description: 'unknown',
  });
}

export function useSanityContentForContributors() {
  return (
    useSanity(
      `*[_type=="contributors"][0]
{
  title,
  description
}`,
      isContentForContributors
    ) ?? {
      title: '',
      description: [],
    }
  );
}
