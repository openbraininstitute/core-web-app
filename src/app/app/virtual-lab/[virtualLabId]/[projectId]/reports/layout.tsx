import { BrainRegionUrlBoundary } from '@/features/brain-region-hierarchy/components/url-boundary';
import { ReportsInnerLayout } from '@/ui/layouts/reports-inner-layout';
import { ReportsLayout } from '@/ui/layouts/reports-layout';
import { ConditionalLeftMenu } from '@/ui/segments/reports/conditional-left-menu';

import type { ReactNode } from 'react';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Page({
  children,
}: ServerSideComponentProp<WorkspaceContext, null> & { children: ReactNode }) {
  return (
    <ReportsLayout>
      <ReportsInnerLayout>
        <div id="notebook-left-menu" className="w-full">
          <ConditionalLeftMenu className="w-full" />
        </div>
        <div id="notebook-main-content" className="secondary-scrollbar w-full overflow-y-auto">
          {children}
        </div>
      </ReportsInnerLayout>
    </ReportsLayout>
  );
}
