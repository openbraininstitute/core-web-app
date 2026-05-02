'use client';

import { useAtomValue } from 'jotai';

import FeaturesSection from '@/ui/segments/help/features';
import GlossarySection from '@/ui/segments/help/glossary';
import { leftPaneViewAtom } from '@/ui/segments/project/get-started/elements/left-pane-view-atom';
import { NewsView } from '@/ui/segments/project/get-started/elements/news-view';
import { TermsView } from '@/ui/segments/project/get-started/elements/terms-view';

export function HelpSubNavigation() {
  const view = useAtomValue(leftPaneViewAtom);
  if (view === 'glossary') return <GlossarySection slot="nav" />;
  if (view === 'features') return <FeaturesSection slot="nav" />;
  if (view === 'terms') return <TermsView slot="nav" />;
  if (view === 'news') return <NewsView slot="nav" />;
  return null;
}

export default HelpSubNavigation;
