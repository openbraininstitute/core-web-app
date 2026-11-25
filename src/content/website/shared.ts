import shared from './shared.json';

import type { ContentForAdopterItem } from '@/services/sanity/api/get-adopters-content';
import type { ContentForSocialMediaLink } from '@/services/sanity/api/get-social-media';

/** Small shared content can be used by both public server pages and the interactive chapter tour. */
export async function getSocialMediaLinks(): Promise<ContentForSocialMediaLink[]> {
  return shared.socialMedia;
}

export async function getAdoptersContent(): Promise<ContentForAdopterItem[]> {
  return shared.adopters;
}
