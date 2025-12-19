import { useAtomValue } from 'jotai';
import { loadable } from 'jotai/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ICircuitSimulationResult } from '@/api/entitycore/types/entities/circuit-simulation-result';
import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import { nwbArrayBufferAtomFamily } from '@/features/ephys-viewer/atoms';
import type { WorkspaceContext } from '@/types/common';
import { IonChannelRecordingParser } from '../ion-channel-recording-parser';

type UseTraceArgs = {
  resource: IElectricalCellRecording | ICircuitSimulationResult;
  ctx?: WorkspaceContext;
};

export default function useTrace({
  resource,
  ctx,
}: UseTraceArgs): [IonChannelRecordingParser | null, Error | null, boolean] {
  const nwbAtom = useMemo(
    () => loadable(nwbArrayBufferAtomFamily({ entity: resource, ctx })),
    [ctx, resource],
  );
  const nwb = useAtomValue(nwbAtom);

  const [trace, setTrace] = useState<IonChannelRecordingParser | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const initialized = useRef<boolean>(false);
  const traceRef = useRef<IonChannelRecordingParser | null>(null);

  const nwbArrayBuffer = nwb.state === 'hasData' ? nwb.data : null;
  const loading = nwb.state === 'loading';

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

    IonChannelRecordingParser.create(resource.id, nwbArrayBuffer)
      .then((t) => {
        setError(null);
        traceRef.current = t;
        setTrace(t);
      })
      .catch((e) => {
        setError(e);
      });

    return () => {
      traceRef.current?.destroy();
      initialized.current = false;
    };
  }, [nwbArrayBuffer, resource]);

  return [trace, error, loading];
}
