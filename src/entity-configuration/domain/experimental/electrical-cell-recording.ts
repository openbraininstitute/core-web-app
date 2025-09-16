import { ElectricalRecordingOriginDictionary } from '@/api/entitycore/types/entities/electrical-cell-recording';
import { DataType } from '@/constants/explore-section/list-views';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import {
  getElectricalCellRecordings,
  getElectricalCellRecording,
} from '@/api/entitycore/queries/experimental/electrical-cell-recording';

import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const ElectricalCellRecording: EntityCoreTypeConfig<IElectricalCellRecording> = {
  group: 'experimental',
  title: 'Electrophysiology',
  legacyType: DataType.ExperimentalElectroPhysiology,
  type: EntityTypeEnum.ElectricalCellRecording,
  slug: EntitySlug.ElectricalCellRecording,
  api: {
    config: {
      allowedFacets: true,
    },
    query: {
      list: (params: Parameters<typeof getElectricalCellRecordings>[0]) =>
        getElectricalCellRecordings({
          ...params,
          filters: {
            ...params.filters,
            recording_origin: ElectricalRecordingOriginDictionary.InVitro,
          },
        }),
      one: getElectricalCellRecording,
    },
  },
  explore: {
    basePrefix: 'experimental',
    routePrefix: 'interactive/experimental',
  },
  asset: {
    extension: 'application/nwb',
  },
  isBookmarkable: true,
  isDownloadable: true,
  isCopyable: true,
  isSimulatable: false,
} as const;
