import { BrainRegionUrlBoundary } from '@/features/brain-region-hierarchy/components/url-boundary';
import { BrainRegionUrlBoundaryMode } from '@/features/brain-region-hierarchy/constants';
import { DataListStateSnapshotLifecycleManager } from '@/ui/segments/data-table/elements/data-lifecycle-manager';

import type { ReactNode } from 'react';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default function DataLayout({
  children,
}: ServerSideComponentProp<WorkspaceContext, null> & {
  children: ReactNode;
}) {
  return (
    <BrainRegionUrlBoundary mode={BrainRegionUrlBoundaryMode.Sync}>
      <DataListStateSnapshotLifecycleManager>{children}</DataListStateSnapshotLifecycleManager>
    </BrainRegionUrlBoundary>
  );
}
