import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { AssetContentType } from '@/api/entitycore/types/shared/global';
import { getSonataWorker, terminateWorker } from '@/features/sonata-viewer/worker/worker-api';
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
  const [metadata, setMetadata] = useState<SonataReportMetadata | null>(null);
  const [workerError, setWorkerError] = useState<Error | null>(null);
  const workerRef = useRef<Remote<SonataWorkerImpl> | null>(null);
  const initialized = useRef(false);

  const asset = assetId
    ? entity.assets?.find((a) => a.id === assetId)
    : entity.assets?.find((a) => a.content_type === AssetContentType.h5);

  if (!asset) {
    throw new Error('No HDF5 file found in entity assets.');
  }

  const { data: arrayBuffer, error: fetchError } = useQuery({
    queryKey: keyBuilder.asset({
      context: ctx,
      entityId: entity.id,
      assetId: asset.id,
      assetPath: asset.path,
      assetType: entity.type,
      asRawResponse: false,
    }),
    queryFn: () =>
      downloadAsset<ArrayBuffer>({
        entityType: entity.type,
        entityId: entity.id,
        id: asset.id,
        ctx,
      }),
  });

  useEffect(() => {
    if (initialized.current || !arrayBuffer) return;
    initialized.current = true;

    if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
      setWorkerError(
        new Error(
          `File size (${Math.round(arrayBuffer.byteLength / 1024 / 1024)}MB) exceeds the 100MB limit.`
        )
      );
      return;
    }

    const workerProxy = getSonataWorker();
    workerRef.current = workerProxy;

    workerProxy
      .loadFile(arrayBuffer)
      .then(setMetadata)
      .catch((e: unknown) => setWorkerError(e instanceof Error ? e : new Error(String(e))));

    return () => {
      workerRef.current = null;
      workerProxy.destroy();
      terminateWorker();
      initialized.current = false;
    };
  }, [arrayBuffer]);

  return {
    metadata,
    worker: workerRef.current,
    error: fetchError || workerError,
    isLoading: !metadata && !fetchError && !workerError,
  };
}
