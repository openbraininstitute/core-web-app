import { fetchSanity } from '@/services/sanity';
import { getCreditsPacks } from '@/services/sanity/api/get-credits-packs';
import { getNewsCount, getNewsList } from '@/services/sanity/api/get-news-list';
import { getPricingContent } from '@/services/sanity/api/get-pricing-content';
import { getSinglePrices } from '@/services/sanity/api/get-single-prices';
import queryForOBIShowcases from '@/ui/segments/reports/obi-showcases/query';
import { isOBIShowcaseProjectProps } from '@/ui/segments/reports/obi-showcases/types';
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
    case EnumSection.Pricing: {
      const [prices, creditsPacks, plans] = await Promise.all([
        getSinglePrices(),
        getCreditsPacks(),
        getPricingContent(),
      ]);
      return <SectionPricing prices={prices} creditsPacks={creditsPacks} plans={plans} />;
    }
    case EnumSection.News: {
      const [initialNews, totalCount] = await Promise.all([
        getNewsList(NEWS_PAGE_SIZE),
        getNewsCount(),
      ]);
      return <SectionNews initialNews={initialNews} totalCount={totalCount} />;
    }
    case EnumSection.Showcases: {
      const projects = await fetchSanity(queryForOBIShowcases, isOBIShowcaseProjectProps);
      return <SectionShowcases projects={projects ?? null} />;
    }
    case EnumSection.Features:
      return <SectionFeatures />;
    default:
      logError('This slug has NOT been implemented yet!', getSection(section));
      return null;
  }
}
