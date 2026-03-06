import isEqual from 'es-toolkit/compat/isEqual';
import { atom } from 'jotai';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { readAtomFamilyWithExpiration } from '@/util/atoms';

import type { IElectricalCellRecording } from '@/api/entitycore/types';
import type { ICircuitSimulationResult } from '@/api/entitycore/types/entities/circuit-simulation-result';
import type { WorkspaceContext } from '@/types/common';

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

      return fetch('/ion-channel-simulation.nwb').then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch NWB file: ${response.status} ${response.statusText}`);
        }
        return response.arrayBuffer();
      });

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
