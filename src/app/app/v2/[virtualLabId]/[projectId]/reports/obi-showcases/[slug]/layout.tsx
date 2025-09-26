import type { ReactNode } from 'react';

import { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import { ReportsLayout } from '@/ui/layouts/reports-layout';
import { OBIShowcaseLeftMenu } from '@/ui/segments/reports/obi-showcases/left-nav-menu';

export default async function SingleOBIShowcaseLayout({
  children,
}: ServerSideComponentProp<WorkspaceContext, null> & { children: ReactNode }) {
  return (
    <ReportsLayout>
      <div className="bg-neutral-1 border-neutral-2 mx-2 mb-2 grid h-full max-h-[calc(100vh-8rem)] w-[calc(100%-10px)] grid-cols-[1fr_3fr] gap-4 overflow-hidden rounded-2xl border p-5 [grid-area:main] [grid-template-areas:'aside_body']">
        <div id="obi-showcase-left-menu" className="w-full [grid-area:aside]">
          <OBIShowcaseLeftMenu className="w-full" />
        </div>
        <div
          id="obi-showcase-main-content"
          className="secondary-scrollbar w-full overflow-y-auto [grid-area:body]"
        >
          {children}
        </div>
      </div>
    </ReportsLayout>
  );
}
