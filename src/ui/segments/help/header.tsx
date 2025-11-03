'use client';

import { usePathname, useRouter } from 'next/navigation';

import { useTabs } from '@/components/detail-view-tabs';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { cn } from '@/utils/css-class';

const HelpSections = {
  Overview: 'overview',
  Tutorials: 'tutorials',
  Glossary: 'glossary',
  Features: 'features',
  Guides: 'guides',
  PriceList: 'prices',
  AIChatTools: 'ai-tools',
  About: 'about',
} as const;

type HelpSectionsKeys = (typeof HelpSections)[keyof typeof HelpSections];

const tabsConfigItems: Array<{
  key: HelpSectionsKeys;
  title: string;
  position: 'first' | 'middle' | 'last';
}> = [
  {
    key: HelpSections.Overview,
    title: 'Overview',
    position: 'first',
  },
  // {
  //   key: HelpSections.Tutorials,
  //   title: 'Tutorials',
  //   position: 'middle',
  // },
  {
    key: HelpSections.Glossary,
    title: 'Glossary',
    position: 'middle',
  },
  {
    key: HelpSections.Guides,
    title: 'Guides',
    position: 'middle',
  },
  {
    key: HelpSections.Features,
    title: 'Features',
    position: 'middle',
  },
  {
    key: HelpSections.PriceList,
    title: 'Price List',
    position: 'middle',
  },
  {
    key: HelpSections.AIChatTools,
    title: 'AI Chat Tools',
    position: 'middle',
  },
  {
    key: HelpSections.About,
    title: 'About',
    position: 'last',
  },
];

function HelpTabs() {
  const breakpoint = useDefaultBreakpoint();
  const { activeTab } = useTabs<HelpSectionsKeys>({
    tabsConfig: tabsConfigItems,
    tabKey: 'section',
    shallow: true,
  });

  const router = useRouter();
  const pathname = usePathname();

  return (
    <PillTabs
      value={activeTab ?? 'overview'}
      defaultValue={activeTab ?? 'overview'}
      className="w-full"
      activationMode="manual"
      onValueChange={(value: string) => {
        const section = encodeURIComponent(value);
        router.replace(`${pathname}?section=${section}`, { scroll: false });
      }}
    >
      <PillTabsList
        className={cn('grid h-10 w-full grid-cols-7 bg-white p-0 shadow-2xl', {
          'h-12': breakpoint === 'xl',
        })}
      >
        {tabsConfigItems.map((tab) => (
          <PillTabsTrigger
            key={tab.key}
            value={tab.key}
            position={tab.position}
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
