import { useQuery } from '@tanstack/react-query';
import * as Comlink from 'comlink';
import { useEffect, useState } from 'react';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { SpikeData } from '@/features/spike-viewer/spike-trace';
import type { SpikeTraceWorkerApi } from '@/features/spike-viewer/spike-trace.worker';
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
}: UseSpikeTraceArgs): [SpikeData | null, Error | null] {
  const [data, setData] = useState<SpikeData | null>(null);
  const [error, setError] = useState<Error | null>(null);

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
    if (!spikeArrayBuffer) return;

    let cancelled = false;
    const worker = new Worker(new URL('../spike-trace.worker.ts', import.meta.url));
    const proxy = Comlink.wrap<SpikeTraceWorkerApi>(worker);

    proxy
      .parseSpikeFile(asset.id, spikeArrayBuffer)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        proxy[Comlink.releaseProxy]();
        worker.terminate();
      });

    return () => {
      cancelled = true;
      worker.terminate();
    };
  }, [spikeArrayBuffer, asset.id]);

  return [data, error];
}
