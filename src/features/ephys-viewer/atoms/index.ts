import isEqual from 'es-toolkit/compat/isEqual';
import { atom } from 'jotai';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { readAtomFamilyWithExpiration } from '@/util/atoms';

import type { IElectricalCellRecording } from '@/api/entitycore/types';
import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { WorkspaceContext } from '@/types/common';

export const nwbArrayBufferAtomFamily = readAtomFamilyWithExpiration(
  ({
    entity,
    ctx,
  }: {
    entity: IElectricalCellRecording | ISimulationResult;
    ctx?: WorkspaceContext;
  }) =>
    atom<Promise<ArrayBuffer>>(() => {
      const asset = entity.assets?.find((a) => a.content_type === 'application/nwb');

      if (!asset) {
        throw new Error('No NWB file found');
      }

      return downloadAsset<ArrayBuffer>({
        entityType: entity.type,
        entityId: entity.id,
        id: asset.id,
        ctx,
      });
    }),
  {
    ttl: 120000, // 2 minutes
    areEqual: isEqual,
  }
);
