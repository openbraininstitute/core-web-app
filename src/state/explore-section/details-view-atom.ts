'use client';

import { Atom, atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import isEqual from 'es-toolkit/compat/isEqual';

import { DetailViewUrlParams } from '@/types/explore-section/application';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export const detailFamily = atomFamily<
  DetailViewUrlParams & { dataType: TExtendedEntitiesTypeDict },
  Atom<Promise<any>>
>(
  (viewParams) =>
    atom(async () => {
      const entity = getEntityByExtendedType({ type: viewParams.dataType });
      if (entity && entity.api.query.one) {
        return await entity.api.query.one({
          id: viewParams.id,
          context:
            viewParams.virtualLabId && viewParams.projectId
              ? {
                  virtualLabId: viewParams.virtualLabId,
                  projectId: viewParams.projectId,
                }
              : undefined,
        });
      }
    }),
  isEqual
);
