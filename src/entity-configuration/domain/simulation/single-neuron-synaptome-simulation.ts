import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import {
  getSingleNeuronSynaptomeSimulationIOResult,
  createSingleNeuronSynaptomeSimulation,
  getSingleNeuronSynaptomeSimulation,
  getSingleNeuronSynaptomeSimulations,
} from '@/api/entitycore/queries/simulation/single-neuron-synaptome-simulation';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { getMEModel } from '@/api/entitycore/queries/model/me-model';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type {
  ISingleNeuronSynaptome,
  ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types';
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
    title: 'Synaptome',
    alternateTitle: 'synaptome simulation',
    extendedType: ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
    type: EntityTypeDict.SingleNeuronSynaptomeSimulation,
    slug: EntitySlug.SingleNeuronSynaptomeSimulation,
    api: {
      config: { allowedFacets: true },
      query: {
        list: getSingleNeuronSynaptomeSimulations,
        one: getSingleNeuronSynaptomeSimulation,
        create: createSingleNeuronSynaptomeSimulation,
      },
      expand: singleNeuronSynaptomeSimulationApiQueryExpand,
    },
    explore: {
      basePrefix: 'simulate',
      routePrefix: 'simulate',
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
