export enum EnumSection {
  ComingSoon = -9,
  Financing = -8,
  PrivacyPolicy = -3,
  TermsAndConditions = -2,
  Home = -1,
  About = 0,
  Mission,
  News,
  Pricing,
  Team,
  Resources,
  Contact,
  Story,
}

export type EnumSectionValues = `${EnumSection}`;

type ExcludeNews = Exclude<EnumSection, EnumSection.News>;

export type EnumSectionStringWithoutNews = `${ExcludeNews}`;
