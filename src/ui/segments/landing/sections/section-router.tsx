import { getNewsCount, getNewsList } from '@/services/sanity/api/get-news-list';
import { logError } from '@/util/logger';

import { getSection } from '../utils';
import SectionFeatures from './section-features/section-features';
import SectionGeneric from './section-generic';
import SectionNews from './section-news/section-news';
import SectionPricing from './section-pricing/section-pricing';
import SectionShowcases from './section-showcases/section-showcases';
import { EnumSection } from './sections';

import type { ReactNode } from 'react';

const NEWS_PAGE_SIZE = 10;

export default async function SectionRouter({
  section,
}: {
  section: EnumSection;
}): Promise<ReactNode> {
  switch (section) {
    case EnumSection.Home:
    case EnumSection.About:
    case EnumSection.Mission:
    case EnumSection.Team:
    case EnumSection.Resources:
    case EnumSection.Notebooks:
    case EnumSection.TermsAndConditions:
    case EnumSection.Financing:
    case EnumSection.PrivacyPolicy:
    case EnumSection.ComingSoon:
    case EnumSection.Story:
    case EnumSection.Contact:
      return <SectionGeneric section={section} />;
    case EnumSection.Pricing:
      return <SectionPricing />;
    case EnumSection.News: {
      const [initialNews, totalCount] = await Promise.all([
        getNewsList(NEWS_PAGE_SIZE),
        getNewsCount(),
      ]);
      return <SectionNews initialNews={initialNews} totalCount={totalCount} />;
    }
    case EnumSection.Showcases:
      return <SectionShowcases />;
    case EnumSection.Features:
      return <SectionFeatures />;
    default:
      logError('This slug has NOT been implemented yet!', getSection(section));
      return null;
  }
}
