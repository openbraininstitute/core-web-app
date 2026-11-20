import { useQuery } from '@tanstack/react-query';

import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { ViewerFrame, ViewerMessage } from '@/features/logbook/editor/blocks/viewer-3d/frame';
import { ModelPreview } from '@/features/scan-config/components/model-preview';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { IViewer3dProps } from '@/features/logbook/editor/blocks/viewers-3d';

/** The platform's circuit viewer, read-only, without electrodes. */
export default function CircuitViewer3d({ entityId, project }: IViewer3dProps) {
  const circuit = useQuery({
    queryKey: keyBuilderLogbook.viewer3d('circuit', entityId),
    queryFn: () => getCircuit({ id: entityId, context: project }),
    staleTime: Number.POSITIVE_INFINITY,
  });
  if (circuit.isPending) return <ViewerMessage text="Loading the circuit…" />;
  if (circuit.isError) return <ViewerMessage text="This circuit can't be shown." />;
  return (
    <ViewerFrame>
      <ModelPreview model={circuit.data} electrodeOverlaysEnabled={false} />
    </ViewerFrame>
  );
}
