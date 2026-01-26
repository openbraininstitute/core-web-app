import { useEffect, useState } from 'react';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { useAppNotification } from '@/components/notification';
import { useModelQuery } from '@/features/scan-config/components/atoms';

import { useWorkspace } from '@/ui/hooks/use-workspace';

export function useCircuitImageURL(circuitId: string) {
  const context = useWorkspace();
  const { entity: circuit } = useModelQuery({ id: circuitId, context });

  const { error } = useAppNotification();
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    const action = async () => {
      if (!circuit || !('assets' in circuit)) return;

      const asset = circuit.assets.find(
        (item) => item.label === AssetLabel.simulation_designer_image
      );
      if (!asset) {
        error({
          message: `No image found for circuit "${circuit.name}" (${circuitId})!`,
        });
        return;
      }
      try {
        const resp = await downloadAsset({
          entityType: EntityTypeDict.Circuit,
          entityId: circuit.id,
          id: asset.id,
          asRawResponse: false,
        });
        if (!(resp instanceof ArrayBuffer)) {
          throw new Error('Wrong image format: expected ArrayBuffer!');
        }
        const blob = new Blob([resp], { type: asset.content_type });
        const newUrl = URL.createObjectURL(blob);
        setUrl(newUrl);
      } catch (ex) {
        error({
          message: `Unable to download image for circuit "${circuit.name}"!\n${ex}`,
        });
      }
    };
    action();
  }, [circuit, circuitId, error]);

  return url;
}
