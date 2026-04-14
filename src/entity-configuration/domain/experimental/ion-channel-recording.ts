import {
  getIonChannelRecording,
  getIonChannelRecordings,
} from '@/api/entitycore/queries/experimental/ion-channel-recording';
import { ElectricalRecordingOriginDictionary } from '@/api/entitycore/types/entities/electrical-cell-recording';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const recordingOriginFilter = {
  recording_origin: ElectricalRecordingOriginDictionary.InVitro,
};

export const IonChannelRecording: EntityCoreTypeConfig<IElectricalCellRecording> = {
  group: EntityTypeGroup.Experimental,
  title: 'Ion channel electrophysiology',
  description:
    'Electrophysiological recordings of [ion channel](https://en.wikipedia.org/wiki/Ion_channel) activity, typically obtained from ion channels expressed in biological cell lines such as CHO (Chinese Hamster Ovary) cells in biological experiments. These recordings contain the ion channel current recordings from various activation, inactivation, deactivation and other voltage-clamp protocols. See Ranjan et al. (2019), https://doi.org/10.3389/fncel.2019.00358 and [Channelpedia](https://channelpedia.epfl.ch/) for more details. The data is stored in NWB format, which is compatible with Python libraries such as [h5py](https://github.com/h5py/h5py). This dataset can be used to extract meaningful electrical features, such as voltage and current characteristics, using tools like [eFEL](https://github.com/openbraininstitute/eFEL).',
  extendedType: ExtendedEntitiesTypeDict.IonChannelRecording,
  type: EntityTypeDict.IonChannelRecording,
  slug: EntitySlug.IonChannelRecording,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
      extraQueryKeyBuilder: recordingOriginFilter,
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
