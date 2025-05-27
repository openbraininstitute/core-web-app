import { atomFamily, loadable } from 'jotai/utils';
import { atom, useAtomValue } from 'jotai';
import { useState } from 'react';
import get from 'lodash/get';

import sessionAtom from '@/state/session';

import { SingleNeuronSynaptome } from '@/entity-configuration/domain/model';
import {
  SingleNeuronSimulation,
  SingleNeuronSynaptomeSimulation,
} from '@/entity-configuration/domain/simulation';
import { renderTimestamp } from '@/entity-configuration/definitions/renderer';
import { getEntityByCoreType } from '@/entity-configuration/domain/helpers';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { tryCatch } from '@/api/utils';

import type { SingleNeuronSimulationStatus } from '@/api/entitycore/types/shared/neuron-simulation';
import type { EntityCoreIdentifiableNamed, Timestamps } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';
import {
  ActivityEntityTypes,
  type ActivityRecord,
  type AllowedEntityTypes,
} from '@/features/activity-view/types';

interface IActivityEntity extends EntityCoreIdentifiableNamed, Timestamps {
  status?: SingleNeuronSimulationStatus;
}

const activityAtomFamily = atomFamily(
  ({
    virtualLabId,
    projectId,
    type,
    key,
  }: WorkspaceContext & {
    type: AllowedEntityTypes | null;
    key: string;
  }) => {
    const entity = type ? get(ActivityEntityTypes, type, null) : null;
    if (!entity) {
      throw new Error(`Invalid entity type: ${type}`);
    }

    const childAtom = atom<Promise<EntityCoreResponse<IActivityEntity>>>(async (get) => {
      const session = get(sessionAtom);
      if (!entity || !entity.api.query.list) {
        throw new Error(`Invalid entity type: ${type}`);
      }
      const { data, error } = await tryCatch(
        entity.api.query.list({
          withFacets: false,
          context: { virtualLabId, projectId },
          // filters: { created_by__id: session?.user?.id },
          // TODO: use the correct user ID from session
          filters: { created_by__id: '44906734-77b0-4880-967b-e5a47933ee60' },
          order_by: '-update_date',
        }) as Promise<EntityCoreResponse<IActivityEntity>>
      );
      if (error) throw error;
      return data;
    });

    childAtom.debugLabel = `activity-table-data/${key}`;
    return childAtom;
  },
  (a, b) => a.key === b.key
);

function isSimulation(t: EntityCoreIdentifiableNamed) {
  return t.type === SingleNeuronSimulation.type || t.type === SingleNeuronSynaptomeSimulation.type;
}

function isSynaptome(t: EntityCoreIdentifiableNamed) {
  return t.type === SingleNeuronSynaptome.type;
}

function generateRowItems(
  entities: Array<IActivityEntity>,
  workspace: { projectId: string; virtualLabId: string }
): Array<ActivityRecord> {
  const defaultStatus = (r: IActivityEntity) => {
    // All single cell and synaptome simulations are 'done' by the time they're saved
    if (isSimulation(r)) return 'done';
    if (isSynaptome(r)) return 'created';
    return r.status ?? 'created';
  };

  const records: Array<ActivityRecord> = entities.map((entity) => {
    return {
      id: entity.id,
      key: entity.id,
      scale: 'Cellular',
      usecase: isSynaptome(entity) ? 'Synaptome' : 'Single cell',
      activity: isSimulation(entity) ? 'Simulate' : 'Build',
      name: entity.name,
      status: defaultStatus(entity),
      date: renderTimestamp(new Date(entity.update_date)),
      linkUrl: resolveExploreDetailsPageUrl({
        ctx: workspace,
        dataType: getEntityByCoreType({ type: entity.type })?.legacyType,
        entityId: entity.id,
      }),
    };
  });

  return records;
}

export const useActivityData = ({
  virtualLabId,
  projectId,
  type,
  key,
}: {
  virtualLabId: string;
  projectId: string;
  type: AllowedEntityTypes | null;
  key: string;
}) => {
  const [cache, setCache] = useState<Map<string, Array<IActivityEntity>>>(new Map());

  const data = useAtomValue(activityAtomFamily({ virtualLabId, projectId, type, key }));
  const isLoading =
    useAtomValue(loadable(activityAtomFamily({ virtualLabId, projectId, type, key }))).state ===
    'loading';

  // useEffect(() => {
  //   if (!isLoading && data) {
  //     const prev = cache.get(key);
  //     setCache((prevCache) => {
  //       prevCache.set(key, [...(prev ?? []), ...(data.data ?? [])]);
  //       return prevCache;
  //     });
  //   }
  // }, [key, data, isLoading]);

  // const current = cache.get(key) || [];
  return {
    data: data ? generateRowItems(data.data, { projectId, virtualLabId }) : [],
    isLoading,
  };
};
