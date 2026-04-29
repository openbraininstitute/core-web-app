import { useSanity } from '@/services/sanity';
import { tryType, typeStringOrNull } from '@/services/sanity/type-utils';

import query from './hooks.groq';

export function useSanityContentForSpecialContributors() {
  return useSanity(query, isContentForSpecialContributors) ?? [];
}

export interface ContentForSpecialContributor {
  firstName: string;
  lastName: string;
  orcid: string | null;
  googleScholar: string | null;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

function isContentForSpecialContributors(data: unknown): data is ContentForSpecialContributor[] {
  return tryType('ContentForSpecialContributors', data, [
    'array',
    {
      firstName: 'string',
      lastName: 'string',
      orcid: typeStringOrNull,
      googleScholar: typeStringOrNull,
      imageURL: 'string',
      imageWidth: 'number',
      imageHeight: 'number',
    },
  ]);
}
