'use client';

import { useSearchParams } from 'next/navigation';

import { match } from 'ts-pattern';

import AboutSection from './about';
import AiChatToolsSection from './ai-chat-tools';
import FeaturesSection from './features';
import GlossarySection from './glossary';
import GuidesSection from './guides';
import OverviewSection from './overview';
import TutorialSection from './tutorials';

function Content() {
  const searchParams = useSearchParams();
  const section = searchParams.get('section');

  return match(section)
    .with(null, () => <OverviewSection />)
    .with('overview', () => <OverviewSection />)
    .with('glossary', () => <GlossarySection />)
    .with('tutorials', () => <TutorialSection />)
    .with('features', () => <FeaturesSection />)
    .with('guides', () => <GuidesSection />)
    .with('ai-tools', () => <AiChatToolsSection />)
    .with('about', () => <AboutSection />)
    .otherwise(() => <OverviewSection />);
}

export default function Sections() {
  return (
    <div className="h-full w-full">
      <Content />
    </div>
  );
}
