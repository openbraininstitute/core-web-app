'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useTabs } from '@/components/detail-view-tabs';
import { useLearnSetting } from '@/features/learn/learn-settings-provider';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { helpSectionShown, LEAN_HELP_SECTIONS } from '@/ui/segments/help/lean';
import { cn } from '@/utils/css-class';

const HelpSections = {
  Overview: 'overview',
  Tutorials: 'tutorials',
  Glossary: 'glossary',
  Features: 'features',
  Guides: 'guides',
  AIChatTools: 'ai-tools',
  About: 'about',
} as const;

type HelpSectionsKeys = (typeof HelpSections)[keyof typeof HelpSections];

const tabsConfigItems: Array<{
  key: HelpSectionsKeys;
  title: string;
}> = [
  {
    key: HelpSections.Overview,
    title: 'Overview',
  },
  {
    key: HelpSections.Tutorials,
    title: 'Tutorials',
  },
  {
    key: HelpSections.Glossary,
    title: 'Glossary',
  },
  {
    key: HelpSections.Guides,
    title: 'Guides',
  },
  {
    key: HelpSections.Features,
    title: 'Features',
  },
  {
    key: HelpSections.AIChatTools,
    title: 'AI Chat Tools',
  },
  {
    key: HelpSections.About,
    title: 'About',
  },
];

function HelpTabs() {
  const breakpoint = useDefaultBreakpoint();
  const pathname = usePathname();
  // with Learn's "remove unneeded features" on, only the lean sections, opening on Guides
  const lean = useLearnSetting('leanHelp');
  const tabs = lean
    ? tabsConfigItems.filter((tab) => LEAN_HELP_SECTIONS.includes(tab.key))
    : tabsConfigItems;

  // Set default tab based on pathname
  const defaultTab = lean
    ? HelpSections.Guides
    : pathname?.includes('/tutorials')
      ? HelpSections.Tutorials
      : HelpSections.Overview;

  const { activeTab, onChangeTab } = useTabs<HelpSectionsKeys>({
    tabsConfig: tabs,
    tabKey: 'section',
    shallow: true,
    defaultKey: defaultTab,
  });
  // the section the page shows, as the server picks it: with Help lean, Guides for a link to one
  // it leaves off; and the address put right to match
  const shown = (lean ? helpSectionShown(activeTab, true) : activeTab) as HelpSectionsKeys;
  useEffect(() => {
    if (shown !== activeTab) onChangeTab(shown)();
  }, [shown, activeTab, onChangeTab]);

  const router = useRouter();

  return (
    <PillTabs
      value={shown}
      defaultValue={shown}
      className="w-full"
      activationMode="manual"
      onValueChange={(value: string) => {
        const section = encodeURIComponent(value);
        router.replace(`${pathname}?section=${section}`, { scroll: false });
      }}
    >
      <PillTabsList
        className={cn(
          'grid h-10 w-full bg-white p-0 shadow-2xl',
          lean ? 'grid-cols-3' : 'grid-cols-7',
          {
            'h-12': breakpoint === 'xl',
          }
        )}
      >
        {tabs.map((tab) => (
          <PillTabsTrigger
            key={tab.key}
            value={tab.key}
            className={cn(
              'data-[state=active]:bg-primary-9 hover:bg-neutral-1 hover:text-primary-8 h-10 px-14! py-3 text-base select-none data-[state=active]:font-bold data-[state=active]:text-white',
              { 'h-12': breakpoint === 'xl' }
            )}
          >
            {tab.title}
          </PillTabsTrigger>
        ))}
      </PillTabsList>
    </PillTabs>
  );
}

export function HelpHeader() {
  return (
    <header className="mb-8 flex w-full flex-row justify-between gap-4">
      <HelpTabs />
    </header>
  );
}
