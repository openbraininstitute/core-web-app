import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import {
  getExperimentalNeuronDensities,
  getExperimentalNeuronDensity,
} from '@/api/entitycore/queries/experimental/neuron-density';

import type { IExperimentalNeuronDensity } from '@/api/entitycore/types/entities/neuron-density';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const NeuronDensity: EntityCoreTypeConfig<IExperimentalNeuronDensity> = {
  group: EntityTypeGroup.Experimental,
  title: 'Neuron density',
  extendedType: ExtendedEntitiesTypeDict.ExperimentalNeuronDensity,
  type: EntityTypeDict.ExperimentalNeuronDensity,
  slug: EntitySlug.ExperimentalNeuronDensity,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: getExperimentalNeuronDensities,
      one: getExperimentalNeuronDensity,
    },
  },
  explore: {
    basePrefix: 'experimental',
    routePrefix: 'interactive/experimental',
  },
  asset: {
    extension: 'application/json',
  },
  detailViewSections: [DetailViewSectionsDict.Overview],
  isDownloadable: true,
  isBookmarkable: true,
  isCopyable: true,
  isSimulatable: false,
  isUploadable: true,
} as const;
