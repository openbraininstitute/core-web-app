import { getAssets } from '@/api/entitycore/queries';

import type { WorkspaceContext } from '@/types/common';

export async function fetchAsset(ctx: WorkspaceContext | undefined, entityId: string) {
  const assets = await getAssets({
    ctx,
    entityId,
    entityType: 'em_cell_mesh',
  });
  const asset = assets.data.find((item) => item.label === 'lod_mesh_block');
  return asset;
}
