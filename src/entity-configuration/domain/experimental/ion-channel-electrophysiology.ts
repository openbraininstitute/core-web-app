import { ElectricalRecordingOriginDictionary } from '@/api/entitycore/types/entities/electrical-cell-recording';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import {
  getElectricalCellRecordings,
  getElectricalCellRecording,
} from '@/api/entitycore/queries/experimental/electrical-cell-recording';

import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const IonChannelElectrophysiology: EntityCoreTypeConfig<IElectricalCellRecording> = {
  group: EntityTypeGroup.Experimental,
  title: 'Ion channel electrophysiology',
  extendedType: ExtendedEntitiesTypeDict.IonChannelElectrophysiology,
  type: EntityTypeDict.IonChannelElectrophysiology,
  slug: EntitySlug.IonChannelElectrophysiology,
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
  detailViewSections: ['overview'],
  isDownloadable: true,
  isBookmarkable: true,
  isCopyable: true,
  isSimulatable: false,
} as const;
