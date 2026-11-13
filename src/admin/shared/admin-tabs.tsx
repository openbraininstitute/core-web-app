'use client';

import { parseAsStringLiteral, useQueryState } from 'nuqs';

import { PillTabs, PillTabsContent, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';

import type { ReactNode } from 'react';

export function AdminTabs<Key extends string>({
  tabs,
}: {
  tabs: { key: Key; label: string; content: ReactNode }[];
}) {
  const keys = tabs.map(({ key }) => key);
  const [active, setActive] = useQueryState(
    'tab',
    parseAsStringLiteral(keys).withDefault(keys[0]).withOptions({ shallow: true })
  );

  return (
    <PillTabs value={active} onValueChange={(next) => setActive(next as Key)}>
      <PillTabsList className="h-10 bg-white p-0 shadow-sm">
        {tabs.map(({ key, label }) => (
          <PillTabsTrigger
            key={key}
            value={key}
            className="data-[state=active]:bg-primary-9 hover:bg-neutral-1 hover:text-primary-9 text-primary-9 h-10 data-[state=active]:font-bold data-[state=active]:text-white"
          >
            {label}
          </PillTabsTrigger>
        ))}
      </PillTabsList>
      {tabs.map(({ key, content }) => (
        <PillTabsContent key={key} value={key} className="mt-4">
          {content}
        </PillTabsContent>
      ))}
    </PillTabs>
  );
}
