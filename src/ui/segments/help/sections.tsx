import { match } from 'ts-pattern';

import AboutSection from '@/ui/segments/help/about';
import FeaturesSection from '@/ui/segments/help/features';
import GuidesSection from '@/ui/segments/help/guides';
import { getSearchParam } from '@/utils/getSearchParams';

export default async function HelpSectionContent({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const params = await searchParams;

  const sectionParams = getSearchParam(params ?? {}, 'section');

  // Only the three tabs left; an old link to a removed one (overview, glossary, tutorials,
  // ai-tools) lands on Guides
  return match(sectionParams)
    .with('features', () => <FeaturesSection />)
    .with('about', () => <AboutSection searchParams={params ?? {}} />)
    .otherwise(() => <GuidesSection searchParams={params ?? {}} />);
}
