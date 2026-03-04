import { useAtomValue } from 'jotai';
import { loadable } from 'jotai/utils';
import { useEffect, useMemo, useRef, useState } from 'react';

import { spikeArrayBufferAtomFamily } from '@/features/spike-viewer/atoms';
import SpikeTrace from '@/features/spike-viewer/spike-trace';

import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

type UseSpikeTraceArgs = {
  entityId: string;
  entityType: string;
  asset: IAsset;
  ctx?: WorkspaceContext;
};

export default function useSpikeTrace({
  entityId,
  entityType,
  asset,
  ctx,
}: UseSpikeTraceArgs): [SpikeTrace | null, Error | null] {
  const [trace, setTrace] = useState<SpikeTrace | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const initialized = useRef<boolean>(false);
  const traceRef = useRef<SpikeTrace | null>(null);

  const spikeAtom = useMemo(
    () => loadable(spikeArrayBufferAtomFamily({ entityId, entityType, asset, ctx })),
    [entityId, entityType, asset, ctx]
  );
  const spike = useAtomValue(spikeAtom);

  const spikeArrayBuffer = spike.state === 'hasData' ? spike.data : null;

  useEffect(() => {
    if (spike.state === 'hasError') {
      setError(spike.error as Error);
    }
  }, [spike]);

  useEffect(() => {
    if (initialized.current || !spikeArrayBuffer) {
      return;
    }

    initialized.current = true;

    SpikeTrace.create(asset.id, spikeArrayBuffer)
      .then((t) => {
        traceRef.current = t;
        setTrace(t);
      })
      .catch((e) => setError(e));

    return () => {
      traceRef.current?.destroy();
      initialized.current = false;
    };
  }, [spikeArrayBuffer, asset.id]);

  return [trace, error];
}
