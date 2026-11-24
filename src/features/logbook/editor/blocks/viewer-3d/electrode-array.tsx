import { useQuery } from '@tanstack/react-query';
import { match } from 'ts-pattern';

import { getSimulatableExtracellularRecordingArray } from '@/api/entitycore/queries/model/simulatable-extracellular-recording-array';
import { ElectrodeArrayViewer } from '@/features/entities/extracellular-recording-array/detail-view';
import { ViewerFrame, ViewerMessage } from '@/features/logbook/editor/blocks/viewer-3d/frame';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { IViewer3dProps } from '@/features/logbook/types';

/**
 * A recording array as its details page draws it: the electrode list, each one ticked in or
 * out, beside its circuit in 3D with the ticked electrodes overlaid.
 */
export default function ElectrodeArrayViewer3d({ entityId, project }: IViewer3dProps) {
  const array = useQuery({
    queryKey: keyBuilderLogbook.viewer3d('electrode-array', entityId),
    queryFn: () => getSimulatableExtracellularRecordingArray({ id: entityId, context: project }),
    staleTime: Number.POSITIVE_INFINITY,
  });
  return match(array)
    .with({ status: 'pending' }, () => <ViewerMessage text="Loading the array…" />)
    .with({ status: 'error' }, () => <ViewerMessage text="This array can't be shown." />)
    .with({ status: 'success' }, ({ data }) => (
      // The viewer sets its own height (list and 3D side by side).
      <ViewerFrame className="h-auto bg-neutral-1 p-3">
        <ElectrodeArrayViewer array={data} />
      </ViewerFrame>
    ))
    .exhaustive();
}
