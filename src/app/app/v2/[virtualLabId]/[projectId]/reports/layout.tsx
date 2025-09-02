import type { ReactNode } from 'react';

import { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import { ReportsInnerLayout } from '@/ui/layouts/reports-inner-layout';
import { ReportsLayout } from '@/ui/layouts/reports-layout';
import { LeftMenu } from '@/ui/segments/reports/left-nav-menu';

export default async function Page({
  children,
}: ServerSideComponentProp<WorkspaceContext, null> & { children: ReactNode }) {
  return (
    <ReportsLayout>
      <ReportsInnerLayout>
        <div id="notebook-left-menu" className="w-full">
          <LeftMenu className="w-full" />
        </div>
        <div id="notebook-main-content" className="secondary-scrollbar w-full overflow-y-auto">
          {children}
        </div>
      </ReportsInnerLayout>
    </ReportsLayout>
  );
}
