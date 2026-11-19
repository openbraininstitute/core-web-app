import { useQuery } from '@tanstack/react-query';

import { getCellMorphology } from '@/api/entitycore/queries/experimental/cell-morphology';
import { CellMorphologyViewer } from '@/features/entities/cell-morphology/detail-view';
import { ViewerFrame, ViewerMessage } from '@/features/logbook/editor/blocks/viewer-3d/frame';

import type { IViewer3dProps } from '@/features/logbook/editor/blocks/viewers-3d';

/** The Data page's morphology viewer, for one morphology. */
export default function MorphologyViewer3d({ entityId, project }: IViewer3dProps) {
  const morphology = useQuery({
    queryKey: ['logbook', 'viewer-3d', 'morphology', entityId],
    queryFn: () => getCellMorphology({ id: entityId, context: project }),
    staleTime: Number.POSITIVE_INFINITY,
  });
  if (morphology.isPending) return <ViewerMessage text="Loading the morphology…" />;
  if (morphology.isError) return <ViewerMessage text="This morphology can't be shown." />;
  return (
    <ViewerFrame>
      <CellMorphologyViewer entity={morphology.data} />
    </ViewerFrame>
  );
}
