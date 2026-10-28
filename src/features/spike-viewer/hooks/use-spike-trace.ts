import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { workerSession } from '@/features/spike-viewer/hooks/use-spike-session';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { SpikeSession } from '@/features/spike-viewer/hooks/use-spike-session';
import type { SpikeData } from '@/features/spike-viewer/spike-trace';
import type { WorkspaceContext } from '@/types/common';

type UseSpikeTraceArgs = {
  entityId: string;
  entityType: TEntityTypeDict;
  asset: IAsset;
  ctx?: WorkspaceContext;
};

/**
 * A spike file parsed in a worker, and that worker kept on as the file's
 * session: it holds a copy of the spikes, to answer the views from off the
 * page's thread.
 */
export default function useSpikeTrace({
  entityId,
  entityType,
  asset,
  ctx,
}: UseSpikeTraceArgs): [SpikeData | null, Error | null, SpikeSession | null] {
  // Kept with its file: the session of a file before has ended, and would leave every question hanging.
  const [parsed, setParsed] = useState<{
    buffer: ArrayBuffer;
    data: SpikeData;
    session: SpikeSession;
  } | null>(null);
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
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (isError) {
      setError(fetchError);
    }
  }, [fetchError, isError]);

  useEffect(() => {
    if (!spikeArrayBuffer) return;

    let cancelled = false;
    const { proxy, session, close } = workerSession(
      new Worker(new URL('../spike-trace.worker.ts', import.meta.url))
    );

    proxy
      .parseSpikeFile(asset.id, spikeArrayBuffer)
      .then((data) => {
        if (!cancelled) setParsed({ buffer: spikeArrayBuffer, data, session });
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });

    return () => {
      cancelled = true;
      close();
    };
  }, [spikeArrayBuffer, asset.id]);

  const current = parsed?.buffer === spikeArrayBuffer ? parsed : null;
  return [current?.data ?? null, error, current?.session ?? null];
}
