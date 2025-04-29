import { DataType } from '@/constants/explore-section/list-views';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import * as entitycore from '@/api/entitycore/queries';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const ElectricalCellRecording: EntityCoreTypeConfig<any> = {
  group: 'experimental',
  legacyType: DataType.ExperimentalElectroPhysiology,
  type: EntityTypeEnum.ElectricalCellRecording,
  slug: 'electrophysiology',
  api: {
    config: {
      allowedFacets: undefined,
      allowedParams: ['page_size', 'page'],
    },
    query: {
      list: entitycore.getElectricalCellRecordings,
      one: entitycore.getElectricalCellRecordings,
    },
  },
  explore: {
    routePrefix: 'interactive/experimental',
  },
  asset: {
    extension: 'application/nwb',
  },
} as const;
