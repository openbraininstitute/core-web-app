import { getCircuit, getCircuits } from '@/api/entitycore/queries/model/circuit';
import { DataType } from '@/constants/explore-section/list-views';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

export const SmallMicrocircuit: EntityCoreTypeConfig<ICircuit> = {
  group: 'models',
  title: 'Small microcircuit',
  legacyType: DataType.SmallMicrocircuit,
  type: EntityTypeEnum.Circuit,
  slug: EntitySlug.SmallMicrocircuit,
  api: {
    config: {
      allowedFacets: true,
    },
    query: {
      list: (...params) =>
        getCircuits({
          ...params,
          filters: { ...params[0].filters, scale__in: ['small'] },
        }),
      one: getCircuit,
    },
  },
  explore: {
    basePrefix: 'model',
    routePrefix: 'interactive/model',
  },
  asset: {
    extension: 'application/json',
  },
  isBookmarkable: false,
  isDownloadable: true,
  isCopyable: true,
  isSimulatable: false,
} as const;
