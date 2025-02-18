import { EnumSection } from '../sections/sections';
import { getSection } from '../utils';
import { tryType } from './_common';
import { useSanity } from './content';

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
  // Sanity onl uses th last pat of the slug.
  // `/welcome/news` becomes `news`.
  const slug = section.slug.split('/').pop();

  return (
    useSanity(
      `*[_type=="pages"][slug.current==${JSON.stringify(slug)}][0]{
  title,
  "content": introduction,
  "backgroundType": mediaType,
  "imageURL": headerImage.asset->url,
  "videoURL": headerVideo,
  "content": introduction,
  "next": scrollCatcher,
  "posterURL": posterImage.asset->url,
  "posterWidth": posterImage.asset->metadata.dimensions.width,
  "posterHeight": posterImage.asset->metadata.dimensions.height,
}`,
      isContentForHero
    ) ?? DEFAULT_CONTENT_FOR_HERO
  );
}
