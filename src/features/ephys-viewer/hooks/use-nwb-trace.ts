import { Session } from 'next-auth';
import { useEffect, useRef, useState } from 'react';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import type { ICircuitSimulationResult } from '@/api/entitycore/types/entities/circuit-simulation-result';
import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import NWBTrace from '@/features/ephys-viewer/nwb-trace';
import { WorkspaceContext } from '@/types/common';

type UseTraceArgs = {
  resource: IElectricalCellRecording | ICircuitSimulationResult;
  session: Session | null;
  ctx?: WorkspaceContext;
};

export default function useTrace({
  resource,
  session,
  ctx,
}: UseTraceArgs): [NWBTrace | null, Error | null] {
  const [nwbArrayBuffer, setNwbArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [trace, setTrace] = useState<NWBTrace | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const initialized = useRef<boolean>(false);
  const traceRef = useRef<NWBTrace | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    const asset = resource.assets?.find((a) => a.content_type === 'application/nwb');

    if (!asset) {
      setError(new Error('No NWB file found'));
      return;
    }

    downloadAsset<ArrayBuffer | null>({
      entityType: resource.type,
      entityId: resource.id,
      id: asset.id,
      ctx,
    })
      .then(setNwbArrayBuffer)
      .catch((e) => setError(e));
  }, [ctx, resource, session]);

  useEffect(() => {
    if (initialized.current || !nwbArrayBuffer) {
      return;
    }

    initialized.current = true;

    NWBTrace.create(resource.id, nwbArrayBuffer)
      .then((t) => {
        traceRef.current = t;
        setTrace(t);
      })
      .catch((e) => setError(e));

    return () => {
      traceRef.current?.destroy();
      initialized.current = false;
    };
  }, [nwbArrayBuffer, resource]);

  return [trace, error];
}
