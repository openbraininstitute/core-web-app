import { atom } from 'jotai';
import isEqual from 'es-toolkit/compat/isEqual';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { IElectricalCellRecording } from '@/api/entitycore/types';
import { ICircuitSimulationResult } from '@/api/entitycore/types/entities/circuit-simulation-result';
import { WorkspaceContext } from '@/types/common';
import { readAtomFamilyWithExpiration } from '@/util/atoms';

export const nwbArrayBufferAtomFamily = readAtomFamilyWithExpiration(
  ({
    entity,
    ctx,
  }: {
    entity: IElectricalCellRecording | ICircuitSimulationResult;
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
