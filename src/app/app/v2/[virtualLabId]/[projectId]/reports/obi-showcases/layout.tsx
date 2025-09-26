import type { ReactNode } from 'react';

import { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import { ReportsInnerLayout } from '@/ui/layouts/reports-inner-layout';
import { ReportsLayout } from '@/ui/layouts/reports-layout';

export default async function OBIShowcasesLayout({
  children,
}: ServerSideComponentProp<WorkspaceContext, null> & { children: ReactNode }) {
  return (
    <ReportsLayout>
      <ReportsInnerLayout>
        <div id="obi-showcases-main-content" className="secondary-scrollbar w-full">
          {children}
        </div>
      </ReportsInnerLayout>
    </ReportsLayout>
  );
}
