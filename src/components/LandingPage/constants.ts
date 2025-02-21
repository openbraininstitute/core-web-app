import { EnumSection } from './sections/sections';

export interface Section {
  index: EnumSection;
  caption: string;
  slug: string;
}

export const DEFAULT_SECTION: Section = {
  index: EnumSection.Home,
  caption: 'Home',
  slug: '/home',
};

export const SECTIONS: Readonly<Section[]> = [
  DEFAULT_SECTION,
  { index: EnumSection.About, caption: 'About', slug: '/about' },
  { index: EnumSection.News, caption: 'News', slug: '/news' },
  { index: EnumSection.Mission, caption: 'Mission', slug: '/mission' },
  { index: EnumSection.Pricing, caption: 'Pricing', slug: '/pricing' },
  { index: EnumSection.Team, caption: 'Team', slug: '/team' },
  { index: EnumSection.Resources, caption: 'Resources', slug: '/resources' },
  { index: EnumSection.Contact, caption: 'Contact', slug: '/contact' },
  { index: EnumSection.PrivacyPolicy, caption: 'Privacy', slug: '/privacy' },
  {
    index: EnumSection.TermsAndConditions,
    caption: 'Terms',
    slug: '/terms',
  },
  { index: EnumSection.ComingSoon, caption: 'Coming Soon', slug: '/releasing-soon' },
];

export const MENU_ITEMS: Readonly<Array<{ caption: string; index: EnumSection }>> = [
  EnumSection.About,
  EnumSection.Mission,
  EnumSection.News,
  EnumSection.Pricing,
  EnumSection.Team,
  EnumSection.Resources,
  EnumSection.Contact,
].map((index) => SECTIONS.find((section) => section.index === index) ?? DEFAULT_SECTION);

export const ID_MENU = 'LandingPage/menu';
