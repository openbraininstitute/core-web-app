import { useQuery } from '@tanstack/react-query';
import { match } from 'ts-pattern';

import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { ViewerFrame, ViewerMessage } from '@/features/logbook/editor/blocks/viewer-3d/frame';
import { ModelPreview } from '@/features/scan-config/components/model-preview';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { IViewer3dProps } from '@/features/logbook/types';

/** The platform's circuit viewer, read-only, without electrodes. */
export default function CircuitViewer3d({ entityId, project }: IViewer3dProps) {
  const circuit = useQuery({
    queryKey: keyBuilderLogbook.viewer3d('circuit', entityId),
    queryFn: () => getCircuit({ id: entityId, context: project }),
    staleTime: Number.POSITIVE_INFINITY,
  });
  return match(circuit)
    .with({ status: 'pending' }, () => <ViewerMessage text="Loading the circuit…" />)
    .with({ status: 'error' }, () => <ViewerMessage text="This circuit can't be shown." />)
    .with({ status: 'success' }, ({ data }) => (
      <ViewerFrame>
        <ModelPreview model={data} electrodeOverlaysEnabled={false} />
      </ViewerFrame>
    ))
    .exhaustive();
}
