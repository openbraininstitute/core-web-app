import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';

import type { IAsset } from '@/api/entitycore/types/shared/global';

/** The mesh's GLB, which the viewer loads; a mesh without one has no viewer. */
export function meshAsset(assets: IAsset[] | null | undefined): IAsset | null {
  return (
    assets?.find(
      (a) =>
        a.label === AssetLabel.cell_surface_mesh && a.content_type === AssetContentType.gltf_binary
    ) ?? null
  );
}
