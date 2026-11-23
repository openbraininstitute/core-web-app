import { useQuery } from '@tanstack/react-query';
import { isNil } from 'es-toolkit';
import { match } from 'ts-pattern';

import { getEmCellMesh } from '@/api/entitycore/queries/experimental/em-cell-mesh';
import { EmCellMeshViewerCard } from '@/features/entities/em-cell-mesh/detail-view';
import { meshAsset } from '@/features/entities/em-cell-mesh/viewer/mesh-asset';
import { ViewerFrame, ViewerMessage } from '@/features/logbook/editor/blocks/viewer-3d/frame';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { IViewer3dProps } from '@/features/logbook/types';

/** The Data page's EM mesh viewer, for one mesh's GLB. */
export default function EmCellMeshViewer3d({ entityId, project }: IViewer3dProps) {
  const mesh = useQuery({
    queryKey: keyBuilderLogbook.viewer3d('em-cell-mesh', entityId),
    queryFn: () => getEmCellMesh({ id: entityId, context: project }),
    staleTime: Number.POSITIVE_INFINITY,
  });
  return match(mesh)
    .with({ status: 'pending' }, () => <ViewerMessage text="Loading the mesh…" />)
    .with({ status: 'error' }, () => <ViewerMessage text="This mesh can't be shown." />)
    .with({ status: 'success' }, ({ data }) => {
      const asset = meshAsset(data.assets);
      return isNil(asset) ? (
        <ViewerMessage text="This mesh has no 3D file." />
      ) : (
        <ViewerFrame>
          <EmCellMeshViewerCard
            className="h-full min-h-0 rounded-none border-0"
            entity={{ id: data.id, name: data.name }}
            asset={asset}
          />
        </ViewerFrame>
      );
    })
    .exhaustive();
}
