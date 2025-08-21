import { resolveDataKey } from '@/utils/key-builder';
import { Atlas } from '@/ui/segments/explore/atlas';

import CellCompositionExplorer from '@/features/cell-composition/elements/cell-composition-explorer';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Page({
  params: promisedParams,
}: ServerSideComponentProp<WorkspaceContext, null>) {
  const { projectId } = await promisedParams;
  const dataKey = resolveDataKey({ projectId, section: 'explore' });

  return (
    <Atlas dataKey={dataKey}>
      <CellCompositionExplorer />
    </Atlas>
  );
}
