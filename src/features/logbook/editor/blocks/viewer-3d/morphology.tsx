import { useQuery } from '@tanstack/react-query';
import { match } from 'ts-pattern';

import { getCellMorphology } from '@/api/entitycore/queries/experimental/cell-morphology';
import { CellMorphologyViewer } from '@/features/entities/cell-morphology/detail-view';
import { ViewerFrame, ViewerMessage } from '@/features/logbook/editor/blocks/viewer-3d/frame';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { IViewer3dProps } from '@/features/logbook/types';

/** The Data page's morphology viewer, for one morphology. */
export default function MorphologyViewer3d({ entityId, project }: IViewer3dProps) {
  const morphology = useQuery({
    queryKey: keyBuilderLogbook.viewer3d('morphology', entityId),
    queryFn: () => getCellMorphology({ id: entityId, context: project }),
    staleTime: Number.POSITIVE_INFINITY,
  });
  return match(morphology)
    .with({ status: 'pending' }, () => <ViewerMessage text="Loading the morphology…" />)
    .with({ status: 'error' }, () => <ViewerMessage text="This morphology can't be shown." />)
    .with({ status: 'success' }, ({ data }) => (
      <ViewerFrame>
        <CellMorphologyViewer entity={data} />
      </ViewerFrame>
    ))
    .exhaustive();
}
