import type { ReactNode } from 'react';

import { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import { NotebookInnerLayout } from '@/ui/layouts/notebook-inner-layout';
import { NotebooksLayout } from '@/ui/layouts/notebooks-layout';
import { NotebookHeader } from '@/ui/segments/notebooks/header';
import { LeftMenu } from '@/ui/segments/notebooks/left-nav-menu';

export default async function Page({
  children,
}: ServerSideComponentProp<WorkspaceContext, null> & { children: ReactNode }) {
  return (
    <NotebooksLayout>
      <NotebookHeader />
      <NotebookInnerLayout>
        <div id="notebook-left-menu" className="w-full">
          <LeftMenu className="w-full" />
        </div>
        <div id="notebook-main-content" className="secondary-scrollbar w-full overflow-y-auto">
          {children}
        </div>
      </NotebookInnerLayout>
    </NotebooksLayout>
  );
}
