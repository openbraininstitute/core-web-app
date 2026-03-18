import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import NWBTrace from '@/features/ephys-viewer/nwb-trace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { WorkspaceContext } from '@/types/common';

type UseTraceArgs = {
  entity: IElectricalCellRecording | ISimulationResult;
  assetId?: string;
  ctx?: WorkspaceContext;
};

export default function useTrace({
  entity,
  assetId,
  ctx,
}: UseTraceArgs): [NWBTrace | null, Error | null] {
  const [trace, setTrace] = useState<NWBTrace | null>(null);
  const [nwbError, setNwbError] = useState<Error | null>(null);
  const initialized = useRef<boolean>(false);
  const traceRef = useRef<NWBTrace | null>(null);

  const asset = assetId
    ? entity.assets?.find((a) => a.id === assetId)
    : entity.assets?.find((a) => a.content_type === 'application/nwb');

  if (!asset) {
    throw new Error('No NWB file found');
  }

  const { data: nwbArrayBuffer, error: fetchError } = useQuery({
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
    if (initialized.current || !nwbArrayBuffer) {
      return;
    }

    initialized.current = true;

    const traceId = asset.id ?? entity.id;

    NWBTrace.create(traceId, nwbArrayBuffer)
      .then((t) => {
        traceRef.current = t;
        setTrace(t);
      })
      .catch((e) => setNwbError(e));

    return () => {
      traceRef.current?.destroy();
      initialized.current = false;
    };
  }, [nwbArrayBuffer, entity.id, asset.id]);

  const error = fetchError || nwbError;

  return [trace, error];
}
