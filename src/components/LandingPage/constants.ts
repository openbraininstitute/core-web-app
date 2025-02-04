import { EnumSection } from './sections/sections';

export interface Section {
  index: EnumSection;
  caption: string;
  slug: string;
}

const SLUG_PREFIX = '/welcome/';

export const DEFAULT_SECTION: Section = {
  index: EnumSection.Home,
  caption: 'Home',
  slug: `${SLUG_PREFIX}home`,
};

export const SECTIONS: Readonly<Section[]> = [
  DEFAULT_SECTION,
  { index: EnumSection.About, caption: 'About', slug: `${SLUG_PREFIX}about` },
  { index: EnumSection.News, caption: 'News', slug: `${SLUG_PREFIX}news` },
  { index: EnumSection.Mission, caption: 'Mission', slug: `${SLUG_PREFIX}mission` },
  { index: EnumSection.Pricing, caption: 'Pricing', slug: `${SLUG_PREFIX}pricing` },
  { index: EnumSection.Team, caption: 'Team', slug: `${SLUG_PREFIX}team` },
  { index: EnumSection.Repositories, caption: 'Repositories', slug: `${SLUG_PREFIX}repositories` },
  { index: EnumSection.Contact, caption: 'Contact', slug: `${SLUG_PREFIX}contact` },
  { index: EnumSection.PrivacyPolicy, caption: 'Privacy', slug: `${SLUG_PREFIX}privacy` },
  {
    index: EnumSection.TermsAndConditions,
    caption: 'Terms',
    slug: `${SLUG_PREFIX}terms`,
  },
];

export const MENU_ITEMS: Readonly<Array<{ caption: string; index: EnumSection }>> = [
  EnumSection.About,
  EnumSection.Mission,
  EnumSection.News,
  EnumSection.Pricing,
  EnumSection.Team,
  EnumSection.Repositories,
  EnumSection.Contact,
].map((index) => SECTIONS.find((section) => section.index === index) ?? DEFAULT_SECTION);

export const ID_MENU = 'LandingPage/menu';
