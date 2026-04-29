import { CellCompositionExplorer } from '@/features/cell-composition/elements/cell-composition-explorer';
import { Atlas } from '@/ui/segments/explore/atlas';
import { AppUInterfaceSection, resolveDataKey } from '@/utils/key-builder';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Page({
  params: promisedParams,
}: ServerSideComponentProp<WorkspaceContext, null>) {
  const { projectId } = await promisedParams;
  const dataKey = resolveDataKey({ projectId, section: AppUInterfaceSection.Data });

  return (
    <Atlas dataKey={dataKey}>
      <CellCompositionExplorer />
    </Atlas>
  );
}
