import { getClient } from '@/services/sanity/client';
import { tryType } from '@/services/sanity/type-utils';
import { getSanityPagesSlugPredicate } from '@/ui/segments/landing/utils';
import { logError } from '@/utils/logger';

export interface ContentForHero {
  title: string;
  content: string | null;
  backgroundType: 'video' | 'image';
  imageURL: string | null;
  videoURL: string | null;
  next: string | null;
  posterURL: string | null;
  posterWidth: number | null;
  posterHeight: number | null;
}

function isContentForHero(data: unknown): data is ContentForHero {
  return tryType('ContentForHero', data, {
    title: 'string',
    content: ['|', 'string', 'null'],
    backgroundType: 'string',
    imageURL: ['|', 'string', 'null'],
    videoURL: ['|', 'string', 'null'],
    next: ['|', 'string', 'null'],
    posterURL: ['|', 'string', 'null'],
    posterWidth: ['|', 'number', 'null'],
    posterHeight: ['|', 'number', 'null'],
  });
}

const DEFAULT_CONTENT_FOR_HERO: ContentForHero = {
  title: '',
  content: '',
  backgroundType: 'image',
  imageURL: '',
  videoURL: '',
  next: '',
  posterURL: '',
  posterWidth: 0,
  posterHeight: 0,
};

export async function getHeroContent(slug: string): Promise<ContentForHero> {
  try {
    const data = await getClient().fetch(
      `*[_type=="pages"][${getSanityPagesSlugPredicate(slug)}][0]{
  title,
  "content": introduction,
  "backgroundType": mediaType,
  "imageURL": headerImage.asset->url,
  "videoURL": headerVideo,
  "next": scrollCatcher,
  "posterURL": posterImage.asset->url,
  "posterWidth": posterImage.asset->metadata.dimensions.width,
  "posterHeight": posterImage.asset->metadata.dimensions.height,
}`
    );
    if (isContentForHero(data)) return data;
  } catch (ex) {
    logError('Error fetching hero content:', ex);
  }
  return DEFAULT_CONTENT_FOR_HERO;
}
