import { useQuery } from '@tanstack/react-query';
import { wrap } from 'comlink';
import { useEffect, useState } from 'react';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { AssetContentType } from '@/api/entitycore/types/shared/global';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { Remote } from 'comlink';
import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { SonataReportMetadata } from '@/features/sonata-viewer/types';
import type { SonataWorkerImpl } from '@/features/sonata-viewer/worker/sonata-worker';
import type { WorkspaceContext } from '@/types/common';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

type UseSonataReportArgs = {
  entity: ISimulationResult;
  assetId?: string;
  ctx?: WorkspaceContext;
};

type WorkerState = {
  metadata: SonataReportMetadata;
  worker: Remote<SonataWorkerImpl>;
};

type UseSonataReportReturn = {
  metadata: SonataReportMetadata | null;
  worker: Remote<SonataWorkerImpl> | null;
  error: Error | null;
  isLoading: boolean;
};

export default function useSonataReport({
  entity,
  assetId,
  ctx,
}: UseSonataReportArgs): UseSonataReportReturn {
  const [state, setState] = useState<WorkerState | null>(null);
  const [workerError, setWorkerError] = useState<Error | null>(null);

  const asset = assetId
    ? entity.assets?.find((a) => a.id === assetId)
    : entity.assets?.find((a) => a.content_type === AssetContentType.h5);

  const assetError = asset ? null : new Error('No HDF5 file found in entity assets.');

  const { data: arrayBuffer, error: fetchError } = useQuery({
    queryKey: keyBuilder.asset({
      context: ctx,
      entityId: entity.id,
      assetId: asset?.id ?? '',
      assetPath: asset?.path ?? '',
      assetType: entity.type,
      asRawResponse: false,
    }),
    queryFn: () =>
      downloadAsset<ArrayBuffer>({
        entityType: entity.type,
        entityId: entity.id,
        id: asset!.id,
        ctx,
      }),
    enabled: !!asset,
  });

  useEffect(() => {
    if (!arrayBuffer) return;

    if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
      setWorkerError(
        new Error(
          `File size (${Math.round(arrayBuffer.byteLength / 1024 / 1024)}MB) exceeds the 100MB limit.`
        )
      );
      return;
    }

    let cancelled = false;
    const rawWorker = new Worker(new URL('../worker/sonata-worker.ts', import.meta.url), {
      type: 'module',
    });
    const workerProxy = wrap<SonataWorkerImpl>(rawWorker);

    workerProxy
      .loadFile(arrayBuffer)
      .then((metadata) => {
        if (!cancelled) setState({ metadata, worker: workerProxy });
      })
      .catch((e: unknown) => {
        if (!cancelled) setWorkerError(e instanceof Error ? e : new Error(String(e)));
      });

    return () => {
      cancelled = true;
      setState(null);
      workerProxy.destroy();
      rawWorker.terminate();
    };
  }, [arrayBuffer]);

  const error = assetError || fetchError || workerError;

  return {
    metadata: state?.metadata ?? null,
    worker: state?.worker ?? null,
    error,
    isLoading: !state && !error,
  };
}
