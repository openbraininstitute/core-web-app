import { useAtomValue } from 'jotai';
import { loadable } from 'jotai/utils';
import { useEffect, useMemo, useRef, useState } from 'react';

import { nwbArrayBufferAtomFamily } from '@/features/ephys-viewer/atoms';
import NWBTrace from '@/features/ephys-viewer/nwb-trace';

import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { WorkspaceContext } from '@/types/common';

type UseTraceArgs = {
  resource: IElectricalCellRecording | ISimulationResult;
  assetId?: string;
  ctx?: WorkspaceContext;
};

export default function useTrace({
  resource,
  assetId,
  ctx,
}: UseTraceArgs): [NWBTrace | null, Error | null] {
  const nwbAtom = useMemo(
    () => loadable(nwbArrayBufferAtomFamily({ entity: resource, assetId, ctx })),
    [ctx, resource, assetId]
  );
  const nwb = useAtomValue(nwbAtom);

  const [trace, setTrace] = useState<NWBTrace | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const initialized = useRef<boolean>(false);
  const traceRef = useRef<NWBTrace | null>(null);

  const nwbArrayBuffer = nwb.state === 'hasData' ? nwb.data : null;

  useEffect(() => {
    if (nwb.state === 'hasError') {
      setError(nwb.error as Error);
    }
  }, [nwb]);

  useEffect(() => {
    if (initialized.current || !nwbArrayBuffer) {
      return;
    }

    initialized.current = true;

    const traceId = assetId ?? resource.id;

    NWBTrace.create(traceId, nwbArrayBuffer)
      .then((t) => {
        traceRef.current = t;
        setTrace(t);
      })
      .catch((e) => setError(e));

    return () => {
      traceRef.current?.destroy();
      initialized.current = false;
    };
  }, [nwbArrayBuffer, resource, assetId]);

  return [trace, error];
}
