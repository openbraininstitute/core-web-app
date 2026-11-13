import { EntityNameDisplayWrapper } from '@/ui/segments/explore/entity-name-display';

import type { ReactNode } from 'react';

/** Sidebar + content row of the data detail page. */
export function DetailViewBody({
  sidebar,
  nameDisplay,
  children,
}: {
  sidebar: ReactNode;
  nameDisplay: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-hidden pt-3">
      <div className="flex w-1/5 shrink-0 flex-col bg-white pl-3.5">{sidebar}</div>
      <div className="min-h-0 w-4/5 px-2 pb-2">
        <div className="primary-scrollbar-dark h-full overflow-x-auto overflow-y-auto">
          <div className="relative min-h-full rounded-2xl border border-neutral-2 bg-primary-9 p-10 pt-4 pb-10 text-white">
            {nameDisplay}
            <EntityNameDisplayWrapper>{children}</EntityNameDisplayWrapper>
          </div>
        </div>
      </div>
    </div>
  );
}
