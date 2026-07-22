import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { useAppNotification } from '@/components/notification';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

/** the asset backing the preview image; absent on circuits that were never rendered. */
export function circuitImageAsset(circuit: ICircuit | undefined) {
  return circuit?.assets?.find((item) => item.label === AssetLabel.simulation_designer_image);
}

export function useCircuitImageURL(circuit: ICircuit | undefined) {
  const context = useWorkspace();
  const { error: notifyError } = useAppNotification();

  const asset = useMemo(() => circuitImageAsset(circuit), [circuit]);

  const {
    data,
    error: assetError,
    isLoading,
  } = useQuery({
    queryKey: [
      'circuit/simulation-designer-image',
      { context, circuitId: circuit?.id, assetId: asset?.id },
    ],
    queryFn: async () => {
      if (!circuit || !asset) throw new Error('Missing circuit or simulation_designer_image asset');
      const resp = await downloadAsset({
        ctx: context,
        entityType: EntityTypeDict.Circuit,
        entityId: circuit.id,
        id: asset.id,
        asRawResponse: false,
      });
      return { buffer: resp, asset };
    },
    enabled: !!circuit?.id && !!asset?.id,
    select: (resp) => {
      if (!(resp?.buffer instanceof ArrayBuffer)) {
        throw new Error('Wrong image format: expected ArrayBuffer!');
      }
      const blob = new Blob([resp.buffer], { type: resp.asset?.content_type });
      const url = URL.createObjectURL(blob);
      return url;
    },
    refetchOnWindowFocus: false,
  });

  if ((!data && !isLoading) || assetError) {
    notifyError({
      message: `No image found for circuit "${circuit?.name}" (${circuit?.id})!`,
      placement: 'topRight',
      key: `circuit-image-error-${circuit?.id}`,
    });
    return { data: undefined, isLoading: false, error: assetError };
  }

  return { data, isLoading, error: assetError };
}
