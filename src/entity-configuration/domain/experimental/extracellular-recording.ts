import {
  getExtracellularRecording,
  getExtracellularRecordings,
} from '@/api/entitycore/queries/experimental/extracellular-recording';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { IExtracellularRecording } from '@/api/entitycore/types/entities/extracellular-recording';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const ExtracellularRecording: EntityCoreTypeConfig<IExtracellularRecording> = {
  group: EntityTypeGroup.Experimental,
  title: 'Extracellular recording',
  extendedType: ExtendedEntitiesTypeDict.ExtracellularRecording,
  type: EntityTypeDict.ExtracellularRecording,
  slug: EntitySlug.ExtracellularRecording,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: getExtracellularRecordings,
      one: getExtracellularRecording,
    },
  },
  asset: { extension: 'application/nwb' },
  detailViewSections: [DetailViewSectionsDict.Overview],
  isDownloadable: true,
  isBookmarkable: false,
  isCopyable: true,
  isSimulatable: false,
} as const;
