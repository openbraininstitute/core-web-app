import {
  getIonChannelRecording,
  getIonChannelRecordings,
} from '@/api/entitycore/queries/experimental/ion-channel-recording';
import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import { ElectricalRecordingOriginDictionary } from '@/api/entitycore/types/entities/electrical-cell-recording';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const recordingOriginFilter = {
  recording_origin: ElectricalRecordingOriginDictionary.InVitro,
};

export const IonChannelRecording: EntityCoreTypeConfig<IElectricalCellRecording> = {
  group: EntityTypeGroup.Experimental,
  title: 'Ion channel electrophysiology',
  extendedType: ExtendedEntitiesTypeDict.IonChannelRecording,
  type: EntityTypeDict.IonChannelRecording,
  slug: EntitySlug.IonChannelRecording,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
      extraRequiredListFilters: recordingOriginFilter,
    },
    query: {
      list: (params: Parameters<typeof getIonChannelRecordings>[0]) =>
        getIonChannelRecordings({
          ...params,
          filters: {
            ...params.filters,
            ...recordingOriginFilter,
          },
        }),
      one: getIonChannelRecording,
    },
  },
  asset: { extension: 'application/nwb' },
  detailViewSections: [DetailViewSectionsDict.Overview],
  isDownloadable: true,
  isBookmarkable: true,
  isCopyable: true,
  isSimulatable: false,
} as const;
