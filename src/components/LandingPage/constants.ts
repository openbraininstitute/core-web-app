import { EnumSection } from './sections/sections';

export interface Section {
  index: EnumSection;
  caption: string;
  slug: string;
}

export const DEFAULT_SECTION: Section = {
  index: EnumSection.Home,
  caption: 'Home',
  slug: '/',
};

export const SECTIONS: Readonly<Section[]> = [
  DEFAULT_SECTION,
  { index: EnumSection.About, caption: 'About', slug: '/about' },
  { index: EnumSection.News, caption: 'News', slug: '/news' },
  { index: EnumSection.Mission, caption: 'Mission', slug: '/mission' },
  { index: EnumSection.Pricing, caption: 'Pricing', slug: '/pricing' },
  { index: EnumSection.Team, caption: 'Team', slug: '/team' },
  { index: EnumSection.Resources, caption: 'Resources', slug: '/resources' },
  { index: EnumSection.Notebooks, caption: 'Notebooks', slug: '/notebooks' },
  { index: EnumSection.Contact, caption: 'Contact', slug: '/contact' },
  { index: EnumSection.PrivacyPolicy, caption: 'Privacy', slug: '/privacy' },
  { index: EnumSection.Sfn2025, caption: 'SfN 2025', slug: '/sfn-2025' },
  { index: EnumSection.Gallery, caption: 'Gallery', slug: '/gallery' },
  {
    index: EnumSection.TermsAndConditions,
    caption: 'Terms',
    slug: '/terms',
  },
  {
    index: EnumSection.Financing,
    caption: 'Financing policy',
    slug: '/financing',
  },
  { index: EnumSection.ComingSoon, caption: 'Coming Soon', slug: '/releasing-soon' },
  {
    index: EnumSection.Story,
    caption: 'The real digital brain story',
    slug: '/the-real-digital-brain-story',
  },
];

export const MENU_ITEMS: Readonly<Array<{ caption: string; index: EnumSection; slug: string }>> = [
  EnumSection.About,
  EnumSection.Mission,
  EnumSection.News,
  EnumSection.Pricing,
  EnumSection.Team,
  EnumSection.Resources,
  EnumSection.Gallery,
  EnumSection.Contact,
].map((index) => SECTIONS.find((section) => section.index === index) ?? DEFAULT_SECTION);

export const ID_MENU = 'LandingPage/menu';
