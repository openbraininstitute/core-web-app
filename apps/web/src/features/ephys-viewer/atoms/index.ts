import isEqual from 'es-toolkit/compat/isEqual';
import { atom } from 'jotai';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { AssetContentType } from '@/api/entitycore/types/shared/global';
import { NWB_ASSET_CACHE_CONFIG } from '@/features/ephys-viewer/constants';
import { readAtomFamilyWithExpiration } from '@/util/atoms';

import type { IElectricalCellRecording } from '@/api/entitycore/types';
import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { WorkspaceContext } from '@/types/common';

export const nwbArrayBufferAtomFamily = readAtomFamilyWithExpiration(
  ({
    entity,
    assetId,
    ctx,
  }: {
    entity: IElectricalCellRecording | ISimulationResult;
    assetId?: string;
    ctx?: WorkspaceContext;
  }) =>
    atom<Promise<ArrayBuffer>>(() => {
      const asset = assetId
        ? entity.assets?.find((a) => a.id === assetId)
        : entity.assets?.find((a) => a.content_type === AssetContentType.nwb);

      if (!asset) {
        throw new Error('No NWB file found');
      }

      return downloadAsset<ArrayBuffer>({
        entityType: entity.type,
        entityId: entity.id,
        id: asset.id,
        ctx,
        cache: NWB_ASSET_CACHE_CONFIG,
      });
    }),
  {
    ttl: 120000, // 2 minutes
    areEqual: isEqual,
  }
);
