import isEqual from 'es-toolkit/compat/isEqual';
import { atom } from 'jotai';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { readAtomFamilyWithExpiration } from '@/util/atoms';

import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

type SpikeAtomParams = {
  entityId: string;
  entityType: string;
  asset: IAsset;
  ctx?: WorkspaceContext;
};

export const spikeArrayBufferAtomFamily = readAtomFamilyWithExpiration(
  ({ entityId, entityType, asset, ctx }: SpikeAtomParams) =>
    atom<Promise<ArrayBuffer>>(() => {
      return downloadAsset<ArrayBuffer>({
        entityType,
        entityId,
        id: asset.id,
        ctx,
      });
    }),
  {
    ttl: 120000, // 2 minutes
    areEqual: isEqual,
  }
);
