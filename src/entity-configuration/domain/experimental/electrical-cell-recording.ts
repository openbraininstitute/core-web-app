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
  description:
    'These are experimental intracellular current- and voltage-clamp recordings, typically obtained from the neuronal soma in biological experiments. Each dataset includes both the input stimuli and the corresponding trace recordings. A single file may contain recordings from multiple experiments of various types, with several experiments repeated across multiple iterations. The data is stored in NWB format, which is compatible with Python libraries such as [PyNWB](https://github.com/NeurodataWithoutBorders/pynwb) and [h5py](https://github.com/h5py/h5py). This dataset can be used to extract meaningful electrical features, such as voltage and current characteristics, using tools like [eFEL](https://github.com/openbraininstitute/eFEL) and [BluePyEfe](https://github.com/openbraininstitute/BluePyEfe).',
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
      list: (params: Parameters<typeof getElectricalCellRecordings>[0]) => {
        return getElectricalCellRecordings({
          ...params,
          filters: {
            ...params.filters,
            ...recordingOriginFilter,
          },
        });
      },
      one: getElectricalCellRecording,
    },
  },
  asset: { extension: 'application/nwb' },
  detailViewSections: [DetailViewSectionsDict.Overview],
  isDownloadable: true,
  isBookmarkable: true,
  isCopyable: true,
  isSimulatable: false,
  isContributable: true,
  isSingleContributeSupport: true,
  isMultipleContributeSupport: true,
} as const;
