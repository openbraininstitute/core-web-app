import type { ReactNode } from 'react';

import { TeardownDataListStoreOnUnmount } from '@/ui/segments/data-table/elements/persistent-data-list';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default function DataLayout({
  children,
}: ServerSideComponentProp<WorkspaceContext, null> & {
  children: ReactNode;
}) {
  return (
    <>
      <TeardownDataListStoreOnUnmount />
      {children}
    </>
  );
}
