import { getClient } from '@/services/sanity/client';
import { tryType, typeStringOrNull } from '@/services/sanity/type-utils';
import { logError } from '@/utils/logger';

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

export async function getSpecialContributors(): Promise<ContentForSpecialContributor[]> {
  try {
    const data = await getClient().fetch(
      `*[_type=="specialContributors"] {
  orcid,
  googleScholar,
  "firstName": first_name,
  "lastName": last_name,
  "imageURL": image.asset->url,
  "imageWidth": image.asset->metadata.dimensions.width,
  "imageHeight": image.asset->metadata.dimensions.height
}`
    );
    if (isContentForSpecialContributors(data)) return data;
  } catch (ex) {
    logError('Error fetching special contributors:', ex);
  }
  return [];
}
