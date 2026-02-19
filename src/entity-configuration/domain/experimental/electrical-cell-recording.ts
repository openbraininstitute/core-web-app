import { without } from 'es-toolkit/compat';

import {
  getElectricalCellRecording,
  getElectricalCellRecordings,
} from '@/api/entitycore/queries/experimental/electrical-cell-recording';
import { ElectricalRecordingOriginDictionary } from '@/api/entitycore/types/entities/electrical-cell-recording';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const recordingOriginFilter = {
  recording_origin__in: without(
    Object.values(ElectricalRecordingOriginDictionary),
    ElectricalRecordingOriginDictionary.InSilico
  ),
};

export const ElectricalCellRecording: EntityCoreTypeConfig<IElectricalCellRecording> = {
  group: EntityTypeGroup.Experimental,
  title: 'Single cell electrophysiology',
  extendedType: ExtendedEntitiesTypeDict.ElectricalCellRecording,
  type: EntityTypeDict.ElectricalCellRecording,
  slug: EntitySlug.ElectricalCellRecording,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
      extraQueryKeyBuilder: recordingOriginFilter,
    },
    query: {
      list: (params: Parameters<typeof getElectricalCellRecordings>[0]) =>
        getElectricalCellRecordings({
          ...params,
          filters: {
            ...params.filters,
            ...recordingOriginFilter,
          },
        }),
      one: getElectricalCellRecording,
    },
  },
  asset: { extension: 'application/nwb' },
  detailViewSections: [DetailViewSectionsDict.Overview],
  isDownloadable: true,
  isBookmarkable: true,
  isCopyable: true,
  isSimulatable: false,
  isUploadable: true,
} as const;
