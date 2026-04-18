'use client';

import { usePathname, useRouter } from 'next/navigation';

import { useTabs } from '@/components/detail-view-tabs';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { cn } from '@/utils/css-class';

const HelpSections = {
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

  const { activeTab } = useTabs<HelpSectionsKeys>({
    tabsConfig: tabsConfigItems,
    tabKey: 'section',
    shallow: true,
    defaultKey: HelpSections.Glossary,
  });

  const router = useRouter();

  return (
    <PillTabs
      value={activeTab ?? HelpSections.Glossary}
      defaultValue={activeTab ?? HelpSections.Glossary}
      className="w-full"
      activationMode="manual"
      onValueChange={(value: string) => {
        const section = encodeURIComponent(value);
        router.replace(`${pathname}?section=${section}`, { scroll: false });
      }}
    >
      <PillTabsList
        className={cn('grid h-10 w-full grid-cols-5 bg-white p-0 shadow-2xl', {
          'h-12': breakpoint === 'xl',
        })}
      >
        {tabsConfigItems.map((tab) => (
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
