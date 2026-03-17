import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import SpikeTrace from '@/features/spike-viewer/spike-trace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

type UseSpikeTraceArgs = {
  entityId: string;
  entityType: TEntityTypeDict;
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

  const {
    data: spikeArrayBuffer,
    isError,
    error: fetchError,
  } = useQuery({
    queryKey: keyBuilder.asset({
      context: ctx,
      entityId,
      assetId: asset.id,
      assetPath: asset.path,
      assetType: entityType,
      asRawResponse: false,
    }),
    queryFn: () =>
      downloadAsset<ArrayBuffer>({
        entityType,
        entityId,
        id: asset.id,
        ctx,
      }),
  });

  useEffect(() => {
    if (isError) {
      setError(fetchError);
    }
  }, [fetchError, isError]);

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
