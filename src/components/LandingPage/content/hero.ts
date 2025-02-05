import { EnumSection } from '../sections/sections';
import { useSanityContent } from './content';
import { assertType } from '@/util/type-guards';

const TYPES: Record<EnumSection, string> = {
  [EnumSection.Home]: 'home',
  [EnumSection.OurMission]: 'our-mission',
  [EnumSection.Contact]: 'contact',
  [EnumSection.OurTeam]: 'our-team',
  [EnumSection.Pricing]: 'pricing',
  [EnumSection.TermsAndConditions]: 'terms-and-conditions',
  [EnumSection.Institute]: 'not implemented yet!',
};

interface ContentForHero {
  title: string;
  content: string | null;
  backgroundType: 'video' | 'image';
  imageURL: string | null;
  videoURL: string | null;
  next: string;
}

function isContentForHero(data: unknown): data is ContentForHero {
  try {
    assertType(data, {
      title: 'string',
      content: ['|', 'string', 'null'],
      backgroundType: 'string',
      imageURL: ['|', 'string', 'null'],
      videoURL: ['|', 'string', 'null'],
      next: 'string',
    });
    return true;
  } catch (ex) {
    // eslint-disable-next-line no-console
    console.debug(data);
    // eslint-disable-next-line no-console
    console.error(`Invalid ContentForHero data!`, ex);
    return false;
  }
}

const DEFAULT_CONTENT_FOR_HERO: ContentForHero = {
  title: '',
  content: '',
  backgroundType: 'image',
  imageURL: '',
  videoURL: '',
  next: '',
};

export function useSanityContentForHero(section: EnumSection) {
  const content = useSanityContent(`*[_type=="pages"][slug.current==${JSON.stringify(
    TYPES[section]
  )}][0]{
  title,
  "content": introduction,
  "backgroundType": mediaType,
  "imageURL": headerImage.asset->url,
  "videoURL": headerVideo,
  "content": introduction,
  "next": scrollCatcher
}`);
  return isContentForHero(content) ? content : DEFAULT_CONTENT_FOR_HERO;
}
