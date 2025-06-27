'use client';

import { match } from 'ts-pattern';
import BrowseSimulations from './simulation/browse';
import StartNewSimulation from './simulation/new';
import { SectionTabs, useTileScopeQuery } from '@/components/VirtualLab/ScopeSelector';

export default function Page() {
  const { section, selectedTab } = useTileScopeQuery();

  const content = match({ section, selectedTab })
    .with({ section: 'simulate', selectedTab: 'new' }, () => <StartNewSimulation />)
    .with({ section: 'simulate', selectedTab: 'browse' }, () => <BrowseSimulations />)
    .otherwise(() => null);

  return (
    <div className="flex min-h-screen w-full flex-col gap-5 pt-8 pr-5">
      <SectionTabs />
      {content}
    </div>
  );
}
