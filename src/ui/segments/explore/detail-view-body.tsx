'use client';

import { usePathname } from 'next/navigation';

import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityNameDisplayWrapper } from '@/ui/segments/explore/entity-name-display';

import type { ReactNode } from 'react';

/**
 * Sidebar + content row of the data detail page. `plainContentSection` opts a section out of the
 * blue detail panel, for content (e.g. an e-model's Workflow tab, the scan-config editor) that is
 * styled for a light page background rather than white-on-blue.
 */
export function DetailViewBody({
  plainContentSection,
  sidebar,
  nameDisplay,
  children,
}: {
  plainContentSection?: boolean;
  sidebar: ReactNode;
  nameDisplay: ReactNode;
  children: ReactNode;
}) {
  const page = usePathname().split('/').pop();
  const isPlainContent = plainContentSection && page === DetailViewSectionsDict.Workflow;

  return (
    <div className="flex h-full min-h-0 max-h-[calc(100%-3.5rem)] gap-3 overflow-hidden pt-2">
      <div className="flex w-1/5 shrink-0 flex-col bg-white pl-3.5">{sidebar}</div>
      <div className="min-h-0 w-4/5 pl-2 pr-3">
        {isPlainContent ? (
          <div className="primary-scrollbar h-full overflow-x-auto overflow-y-auto">{children}</div>
        ) : (
          <div className="primary-scrollbar-dark h-full overflow-x-auto overflow-y-auto [scrollbar-gutter:stable] pr-0.5">
            <div className="min-h-full rounded-2xl border border-neutral-2 bg-primary-9 p-10 pt-4 pb-10 text-white">
              {nameDisplay}
              <EntityNameDisplayWrapper>{children}</EntityNameDisplayWrapper>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
