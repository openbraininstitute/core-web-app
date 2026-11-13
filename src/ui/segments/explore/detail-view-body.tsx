'use client';

import { usePathname } from 'next/navigation';

import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { PHONE_DETAIL_SIDEBAR } from '@/ui/segments/explore/detail-phone';
import { EntityNameDisplayWrapper } from '@/ui/segments/explore/entity-name-display';
import { cn } from '@/utils/css-class';

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
    // on a phone the side menu goes over the content, as rows (the user asked for a details page made for a phone)
    <div className="flex min-h-0 flex-1 gap-3 overflow-hidden pt-3 max-md:flex-col max-md:gap-2 max-md:pt-0">
      <div className={cn('flex w-1/5 shrink-0 flex-col bg-white pl-3.5', PHONE_DETAIL_SIDEBAR)}>{sidebar}</div>
      <div className="min-h-0 w-4/5 px-2 pb-2 max-md:w-full max-md:flex-1 max-md:px-0 max-md:pb-0">
        {isPlainContent ? (
          <div className="primary-scrollbar h-full overflow-x-auto overflow-y-auto">{children}</div>
        ) : (
          <div className="primary-scrollbar-dark h-full overflow-x-auto overflow-y-auto">
            <div className="min-h-full rounded-2xl border border-neutral-2 bg-primary-9 p-10 pt-4 pb-10 text-white max-md:p-4 max-md:pb-8">
              {nameDisplay}
              <EntityNameDisplayWrapper>{children}</EntityNameDisplayWrapper>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
