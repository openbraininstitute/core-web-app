import { getMEModel } from '@/api/entitycore/queries';
import {
  createSingleNeuronSynaptome,
  getSingleNeuronSynaptome,
  getSingleNeuronSynaptomeConfiguration,
  getSingleNeuronSynaptomes,
} from '@/api/entitycore/queries/model/single-neuron-synaptome';
import type { ISingleNeuronSynaptome } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

export const apiQueryExpand = {
  memodel: (source: ISingleNeuronSynaptome, context: WorkspaceContext | undefined) =>
    getMEModel({ id: source.me_model.id, context }),
  config: (source: ISingleNeuronSynaptome, context: WorkspaceContext | undefined) =>
    getSingleNeuronSynaptomeConfiguration(source, context),
};

export const SingleNeuronSynaptome: EntityCoreTypeConfig<ISingleNeuronSynaptome> = {
  group: EntityTypeGroup.Models,
  title: 'Synaptome',
  extendedType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
  type: EntityTypeDict.SingleNeuronSynaptome,
  slug: EntitySlug.SingleNeuronSynaptome,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: getSingleNeuronSynaptomes,
      one: getSingleNeuronSynaptome,
      create: createSingleNeuronSynaptome,
    },
    expand: apiQueryExpand,
  },
  explore: {
    basePrefix: 'model',
    routePrefix: 'interactive/model',
  },
  asset: {
    extension: 'application/json',
    configfile: AssetLabel.single_neuron_synaptome_config,
  },
  detailViewSections: [
    DetailViewSectionsDict.Overview,
    DetailViewSectionsDict.Configuration,
    DetailViewSectionsDict.RelatedArtifacts,
  ],
  isBookmarkable: true,
  isDownloadable: true,
  isCopyable: true,
  isSimulatable: true,
} as const;
