import type { ReactNode } from 'react';

import { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import { ReportsLayout } from '@/ui/layouts/notebook-reports';
import { ReportsInnerLayout } from '@/ui/layouts/reports-inner-layout';
import { LeftMenu } from '@/ui/segments/reports/left-menu';

export default async function Page({
  children,
}: ServerSideComponentProp<WorkspaceContext, null> & { children: ReactNode }) {
  return (
    <ReportsLayout>
      <ReportsInnerLayout>
        <div id="reports-left-menu" className="w-full">
          <LeftMenu className="w-full" />
        </div>
        <div id="reports-main-content" className="secondary-scrollbar w-full overflow-y-auto">
          {children}
        </div>
      </ReportsInnerLayout>
    </ReportsLayout>
  );
}
