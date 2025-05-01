import { DataType } from '@/constants/explore-section/list-views';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import * as entitycore from '@/api/entitycore/queries';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';

export const ElectricalCellRecording: EntityCoreTypeConfig<IElectricalCellRecording> = {
  group: 'experimental',
  title: 'Electrophysiology',
  legacyType: DataType.ExperimentalElectroPhysiology,
  type: EntityTypeEnum.ElectricalCellRecording,
  slug: EntitySlug.ElectricalCellRecording,
  api: {
    config: {
      allowedFacets: true,
      allowedParams: 'all',
    },
    query: {
      list: entitycore.getElectricalCellRecordings,
      one: entitycore.getElectricalCellRecording,
    },
  },
  explore: {
    basePrefix: 'experimental',
    routePrefix: 'interactive/experimental',
  },
  asset: {
    extension: 'application/nwb',
  },
} as const;
