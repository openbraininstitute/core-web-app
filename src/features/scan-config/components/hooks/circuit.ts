import { useQuery } from '@tanstack/react-query';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { useAppNotification } from '@/components/notification';
import { useModelQuery } from '@/features/scan-config/components/atoms';
import { useWorkspace } from '@/ui/hooks/use-workspace';

export function useCircuitImageURL(circuitId: string) {
  const context = useWorkspace();
  const { error: notifyError } = useAppNotification();
  const {
    entity: circuit,
    error: circuitError,
    isLoading: circuitLoading,
  } = useModelQuery({ id: circuitId, context });

  const {
    data,
    error: assetError,
    isLoading: assetLoading,
  } = useQuery({
    queryKey: ['circuit/simulation-designer-image', { context, circuitId }],
    queryFn: async () => {
      const asset = (circuit as ICircuit).assets.find(
        (item) => item.label === AssetLabel.simulation_designer_image
      );
      if (!asset) {
        notifyError({
          message: `No image found for circuit "${circuit?.name}" (${circuitId})!`,
        });
        return;
      }
      const resp = await downloadAsset({
        entityType: EntityTypeDict.Circuit,
        // biome-ignore lint/style/noNonNullAssertion: the function is enable only if circuit is present (see useQuery/enabled)
        entityId: circuit!.id,
        id: asset.id,
        asRawResponse: false,
      });

      return { buffer: resp, asset };
    },
    enabled: !!circuit,
    select: (resp) => {
      if (!(resp?.buffer instanceof ArrayBuffer)) {
        throw new Error('Wrong image format: expected ArrayBuffer!');
      }
      const blob = new Blob([resp.buffer], { type: resp.asset.content_type });
      const url = URL.createObjectURL(blob);
      return url;
    },
  });
  const isLoading = circuitLoading || assetLoading;
  const error = circuitError || assetError;

  return { data, isLoading, error };
}
