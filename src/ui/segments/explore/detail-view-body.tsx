'use client';

import { useFullPageSection } from '@/ui/segments/explore/detail-menu';
import { EntityNameDisplayWrapper } from '@/ui/segments/explore/entity-name-display';

import type { ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

/** Sidebar + content row of the data detail page; a full-page section drops the sidebar. */
export function DetailViewBody({
  type,
  sidebar,
  nameDisplay,
  children,
}: {
  type: TExtendedEntitiesTypeDict;
  sidebar: ReactNode;
  nameDisplay: ReactNode;
  children: ReactNode;
}) {
  if (useFullPageSection(type)) {
    return <div className="min-h-0 flex-1 px-5 pb-5">{children}</div>;
  }

  return (
    <div className="flex h-full min-h-0 max-h-[calc(100%-3.5rem)] gap-3 overflow-hidden pt-2">
      <div className="flex w-1/5 shrink-0 flex-col bg-white pl-3.5">{sidebar}</div>
      <div className="min-h-0 w-4/5 pl-2 pr-3">
        <div className="primary-scrollbar-dark h-full overflow-x-auto overflow-y-auto [scrollbar-gutter:stable] pr-0.5">
          <div className="min-h-full rounded-2xl border border-neutral-2 bg-primary-9 p-10 pt-4 pb-10 text-white">
            {nameDisplay}
            <EntityNameDisplayWrapper>{children}</EntityNameDisplayWrapper>
          </div>
        </div>
      </div>
    </div>
  );
}
