import { match } from 'ts-pattern';

import AboutSection from '@/ui/segments/help/about';
import AiChatToolsSection from '@/ui/segments/help/ai-chat-tools';
import FeaturesSection from '@/ui/segments/help/features';
import GlossarySection from '@/ui/segments/help/glossary';
import GuidesSection from '@/ui/segments/help/guides';
import OverviewSection from '@/ui/segments/help/overview';
import TutorialSection from '@/ui/segments/help/tutorials';
import { getSearchParam } from '@/utils/getSearchParams';

export default async function HelpSectionContent({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const params = await searchParams;

  const sectionParams = getSearchParam(params ?? {}, 'section');

  return match(sectionParams)
    .with(null, () => <OverviewSection />)
    .with('overview', () => <OverviewSection />)
    .with('glossary', () => <GlossarySection />)
    .with('tutorials', () => <TutorialSection />)
    .with('features', () => <FeaturesSection />)
    .with('guides', () => <GuidesSection searchParams={params ?? {}} />)
    .with('ai-tools', () => <AiChatToolsSection />)
    .with('about', () => <AboutSection searchParams={params ?? {}} />)
    .otherwise(() => <OverviewSection />);
}
