import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { DataType } from '@/constants/explore-section/list-views';
import * as entitycore from '@/api/entitycore/queries';

import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const SynapsePerConnection: EntityCoreTypeConfig<IExperimentalSynapsesPerConnection> = {
  group: 'experimental',
  title: 'Synapse per connection',
  legacyType: DataType.ExperimentalSynapsePerConnection,
  type: EntityTypeEnum.ExperimentalSynapsesPerConnection,
  slug: EntitySlug.ExperimentalSynapsesPerConnection,
  api: {
    config: {
      allowedFacets: true,
      allowedParams: 'all',
    },
    query: {
      list: entitycore.getExperimentalSynapsesPerConnections,
      one: entitycore.getExperimentalSynapsesPerConnection,
    },
  },
  explore: {
    basePrefix: 'experimental',
    routePrefix: 'interactive/experimental',
  },
  asset: {
    extension: 'application/json',
  },
} as const;
