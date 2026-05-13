import saveAs from 'file-saver';
import React from 'react';

import { downloadAsset, getAssets } from '@/api/entitycore/queries/assets';
import useWorkspace from '@/ui/hooks/use-workspace';

import { CircuitLoader } from './circuit-loader';

import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';

export function useCircuitLoader(model: TSupportedEntitiesForScanConfiguration) {
  const { virtualLabId, projectId } = useWorkspace();
  return React.useMemo(
    () => new CircuitLoader(model, virtualLabId, projectId),
    [model, virtualLabId, projectId]
  );
}

export function useDownloadHandler(model: TSupportedEntitiesForScanConfiguration) {
  const ctx = useWorkspace();
  const handleDownload = async () => {
    const assets = await getAssets({
      ctx,
      entityType: model.type,
      entityId: model.id,
    });
    const asset = assets.data.find((item) => item.label === 'compressed_sonata_circuit');
    if (!asset) {
      return;
    }
    const compressedData = await downloadAsset({
      ctx,
      entityType: model.type,
      entityId: model.id,
      id: asset.id,
    });
    if (!(compressedData instanceof ArrayBuffer)) {
      return;
    }
    saveAs(new Blob([compressedData]), `${sanitize(model.name)}.tgz`);
  };
  return handleDownload;
}

function sanitize(name: string) {
  return name.split(/[^a-z0-9_]/gi).join('-');
}
