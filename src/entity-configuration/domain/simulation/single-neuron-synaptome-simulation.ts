import { getMEModel } from '@/api/entitycore/queries/model/me-model';
import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import {
  createSingleNeuronSynaptomeSimulation,
  getSingleNeuronSynaptomeSimulation,
  getSingleNeuronSynaptomeSimulationIOResult,
  getSingleNeuronSynaptomeSimulations,
} from '@/api/entitycore/queries/simulation/single-neuron-synaptome-simulation';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type {
  ISingleNeuronSynaptome,
  ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

export const singleNeuronSynaptomeSimulationApiQueryExpand = {
  synaptome: (source: ISingleNeuronSynaptomeSimulation, context: WorkspaceContext | undefined) =>
    getSingleNeuronSynaptome({ id: source.synaptome.id, context }),
  memodel: (
    _: ISingleNeuronSynaptomeSimulation,
    context: WorkspaceContext | undefined,
    synaptome: ISingleNeuronSynaptome
  ) => getMEModel({ id: synaptome.me_model.id, context }),
  config: (source: ISingleNeuronSynaptomeSimulation, context: WorkspaceContext | undefined) =>
    getSingleNeuronSynaptomeSimulationIOResult(source, context),
};

export async function resolveSingleNeuronSynaptomeSimulation(
  id: string,
  context: WorkspaceContext | undefined
) {
  const source = await getSingleNeuronSynaptomeSimulation({ id, context });
  const synaptome = await singleNeuronSynaptomeSimulationApiQueryExpand.synaptome(source, context);
  const memodel = await singleNeuronSynaptomeSimulationApiQueryExpand.memodel(
    source,
    context,
    synaptome
  );

  return { source, synaptome, memodel };
}

export const SingleNeuronSynaptomeSimulation: EntityCoreTypeConfig<ISingleNeuronSynaptomeSimulation> =
  {
    group: EntityTypeGroup.Simulations,
    title: 'Synaptome (legacy)',
    alternateTitle: 'synaptome simulation (legacy)',
    legacy: true,
    extendedType: ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
    type: EntityTypeDict.SingleNeuronSynaptomeSimulation,
    slug: EntitySlug.SingleNeuronSynaptomeSimulation,
    api: {
      config: {
        allowedFacets: true,
        ilikeSearchEnabled: true,
      },
      query: {
        count: (...params) => {
          const filters = params[0].filters;
          return getSingleNeuronSynaptomeSimulations({
            ...params,
            context: params[0].context,
            withFacets: params[0].withFacets,
            filters: {
              ...filters,
              page: 1,
              page_size: 1,
            },
          }).then((response) => response.pagination.total_items);
        },
        list: getSingleNeuronSynaptomeSimulations,
        one: getSingleNeuronSynaptomeSimulation,
        create: createSingleNeuronSynaptomeSimulation,
      },
      expand: singleNeuronSynaptomeSimulationApiQueryExpand,
    },
    asset: {
      extension: 'application/json',
      configfile: AssetLabel.single_neuron_synaptome_simulation_data,
    },
    isBookmarkable: true,
    detailViewSections: [
      DetailViewSectionsDict.Overview,
      DetailViewSectionsDict.Configuration,
      DetailViewSectionsDict.Results,
    ],
    isDownloadable: true,
    isCopyable: true,
    isSimulatable: false,
  } as const;
