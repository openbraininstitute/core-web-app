'use client';

import { Atom, atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import isEqual from 'lodash/isEqual';

import { DetailViewUrlParams } from '@/types/explore-section/application';
import { ExtendedEntitiesType } from '@/api/entitycore/types/extended-entity-type';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';

export const backToListPathAtom = atom<string | null | undefined>(null);
export const brainRegionSidebarIsCollapsedAtom = atom(true);

export const detailFamily = atomFamily<
  DetailViewUrlParams & { dataType: ExtendedEntitiesType },
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
              ? { virtualLabId: viewParams.virtualLabId, projectId: viewParams.projectId }
              : undefined,
        });
      }
    }),
  isEqual
);
