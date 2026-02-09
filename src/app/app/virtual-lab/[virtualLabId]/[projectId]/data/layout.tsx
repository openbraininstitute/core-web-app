import { DataListStateSnapshotLifecycleManager } from '@/ui/segments/data-table/elements/data-lifecycle-manager';

import type { ReactNode } from 'react';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default function DataLayout({
  children,
}: ServerSideComponentProp<WorkspaceContext, null> & {
  children: ReactNode;
}) {
  return <DataListStateSnapshotLifecycleManager>{children}</DataListStateSnapshotLifecycleManager>;
}
