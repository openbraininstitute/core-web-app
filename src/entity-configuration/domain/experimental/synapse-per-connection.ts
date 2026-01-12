import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import {
  getExperimentalSynapsesPerConnections,
  getExperimentalSynapsesPerConnection,
} from '@/api/entitycore/queries/experimental/synapses-per-connection';

import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const SynapsePerConnection: EntityCoreTypeConfig<IExperimentalSynapsesPerConnection> = {
  group: EntityTypeGroup.Experimental,
  title: 'Synapse per connection',
  extendedType: ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection,
  type: EntityTypeDict.ExperimentalSynapsesPerConnection,
  slug: EntitySlug.ExperimentalSynapsesPerConnection,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: getExperimentalSynapsesPerConnections,
      one: getExperimentalSynapsesPerConnection,
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
  isCopyable: true,
  isSimulatable: false,
  isBookmarkable: true,
} as const;
