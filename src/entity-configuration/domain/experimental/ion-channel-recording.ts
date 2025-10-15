import { ElectricalRecordingOriginDictionary } from '@/api/entitycore/types/entities/electrical-cell-recording';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import {
  getIonChannelRecording,
  getIonChannelRecordings,
} from '@/api/entitycore/queries/experimental/ion-channel-recording';

import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const IonChannelRecording: EntityCoreTypeConfig<IElectricalCellRecording> = {
  group: EntityTypeGroup.Experimental,
  title: 'Ion channel electrophysiology',
  extendedType: ExtendedEntitiesTypeDict.IonChannelRecording,
  type: EntityTypeDict.IonChannelRecording,
  slug: EntitySlug.IonChannelRecording,
  api: {
    config: {
      allowedFacets: true,
    },
    query: {
      list: (params: Parameters<typeof getIonChannelRecordings>[0]) =>
        getIonChannelRecordings({
          ...params,
          filters: {
            ...params.filters,
            recording_origin: ElectricalRecordingOriginDictionary.InVitro,
          },
        }),
      one: getIonChannelRecording,
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
