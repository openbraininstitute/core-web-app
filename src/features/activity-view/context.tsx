import { atomFamily, atomWithRefresh, loadable } from 'jotai/utils';
import { useAtomValue } from 'jotai';
import get from 'es-toolkit/compat/get';

import sessionAtom from '@/state/session';

import { SingleNeuronSynaptome } from '@/entity-configuration/domain/model/single-neuron-synaptome';
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
import { getPersons } from '@/api/entitycore/queries/general/person-agent';
import { pageNumberAtom, pageSizeAtom } from '@/state/explore-section/list-view-atoms';

interface IActivityEntity extends EntityCoreIdentifiableNamed, Timestamps {
  status?: SingleNeuronSimulationStatus;
}

export const activityAtomFamily = atomFamily(
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

    const childAtom = atomWithRefresh<Promise<EntityCoreResponse<IActivityEntity>>>(
      async (_get) => {
        const pageNumber = _get(pageNumberAtom(key));
        const pageSize = _get(pageSizeAtom({ key }));
        const session = _get(sessionAtom);

        if (!entity || !entity.api.query.list) {
          throw new Error(`Invalid entity type: ${type}`);
        }

        const { data: person, error: personError } = await tryCatch(
          getPersons({
            filters: {
              sub_id: session?.user.id,
            },
          })
        );

        if (personError) {
          throw Error('Relative user agent not found');
        }
        if (!person.data.length) {
          return {
            data: [],
            pagination: {
              page: 1,
              page_size: 10,
              total_items: 0,
            },
          };
        }
        const { data, error } = await tryCatch(
          entity.api.query.list({
            withFacets: false,
            context: { virtualLabId, projectId },
            filters: {
              created_by__id: person?.data.at(0)?.id,
              page: pageNumber,
              page_size: pageSize,
            },
            order_by: '-update_date',
          }) as Promise<EntityCoreResponse<IActivityEntity>>
        );

        if (error) throw error;
        return data;
      }
    );

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
        dataType: getEntityByCoreType({ type: entity.type })?.extendedType,
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
  const data = useAtomValue(activityAtomFamily({ virtualLabId, projectId, type, key }));
  const isLoading =
    useAtomValue(loadable(activityAtomFamily({ virtualLabId, projectId, type, key }))).state ===
    'loading';

  return {
    data: data ? generateRowItems(data.data, { projectId, virtualLabId }) : [],
    total: data.pagination.total_items,
    isLoading,
  };
};
