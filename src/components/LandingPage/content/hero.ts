import { useSanity } from '@/services/sanity';

import { getSanityPagesSlugPredicate, getSection } from '../utils';
import { tryType } from './_common';

import type { EnumSection } from '../sections/sections';

interface ContentForHero {
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

export function useSanityContentForHero(sectionIndex: EnumSection): ContentForHero {
  const section = getSection(sectionIndex);
  const slugPred = getSanityPagesSlugPredicate(section.slug);

  return (
    useSanity(
      `*[_type=="pages"][${slugPred}][0]{
  title,
  "content": introduction,
  "backgroundType": mediaType,
  "imageURL": headerImage.asset->url,
  "videoURL": headerVideo,
  "next": scrollCatcher,
  "posterURL": posterImage.asset->url,
  "posterWidth": posterImage.asset->metadata.dimensions.width,
  "posterHeight": posterImage.asset->metadata.dimensions.height,
}`,
      isContentForHero
    ) ?? DEFAULT_CONTENT_FOR_HERO
  );
}
