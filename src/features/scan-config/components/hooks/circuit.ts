import { useQuery } from '@tanstack/react-query';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { useAppNotification } from '@/components/notification';
import { useModelQuery } from '@/features/scan-config/components/atoms';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

export function useCircuitImageURL(circuitId: string) {
  const context = useWorkspace();
  const { error: notifyError } = useAppNotification();
  const {
    entity: circuit,
    error: circuitError,
    isLoading: circuitLoading,
  } = useModelQuery({ id: circuitId, context });

  const asset = (circuit as ICircuit)?.assets?.find(
    (item) => item.label === AssetLabel.simulation_designer_image
  );

  const {
    data,
    error: assetError,
    isLoading: assetLoading,
  } = useQuery({
    queryKey: ['circuit/simulation-designer-image', { context, circuitId, assetId: asset?.id }],
    queryFn: async () => {
      const resp = await downloadAsset({
        ctx: context,
        entityType: EntityTypeDict.Circuit,
        // biome-ignore lint/style/noNonNullAssertion: query is only enabled when circuit and asset are available
        entityId: circuit!.id,
        // biome-ignore lint/style/noNonNullAssertion: query is only enabled when circuit and asset are available
        id: asset?.id!,
        asRawResponse: false,
      });
      return { buffer: resp, asset };
    },
    enabled: !!circuit && !!asset && !circuitLoading,
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
  const isLoading = circuitLoading || assetLoading;
  const error = circuitError || assetError;

  if ((!data && !isLoading) || error) {
    notifyError({
      message: `No image found for circuit "${circuit?.name}" (${circuitId})!`,
      placement: 'topRight',
      key: `circuit-image-error-${circuitId}`,
    });
    return { data: undefined, isLoading: false, error };
  }

  return { data, isLoading, error };
}
