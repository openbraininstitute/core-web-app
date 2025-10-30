import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import {
  getIonChannelModels,
  getIonChannelModel,
} from '@/api/entitycore/queries/model/ion-channel-model';

import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { IonChannelModel as IIonChannelModel } from '@/api/entitycore/types/entities/ion-channel';

export const IonChannelModel: EntityCoreTypeConfig<IIonChannelModel> = {
  group: EntityTypeGroup.Models,
  title: 'Ion channel model',
  extendedType: ExtendedEntitiesTypeDict.IonChannelModel,
  type: EntityTypeDict.IonChannelModel,
  slug: EntitySlug.IonChannelModel,
  api: {
    config: {
      allowedFacets: true,
    },
    query: {
      list: (...params) => {
        return getIonChannelModels({
          ...params,
          context: params[0].context,
          withFacets: params[0].withFacets,
          filters: { ...params[0].filters },
        });
      },
      one: getIonChannelModel,
    },
  },
  explore: {
    basePrefix: 'model',
    routePrefix: 'interactive/model',
  },
  asset: {
    extension: 'application/json',
  },
  detailViewSections: [DetailViewSectionsDict.Overview, DetailViewSectionsDict.RelatedArtifacts],
  isBookmarkable: false,
  isDownloadable: true,
  isCopyable: true,
  isSimulatable: false,
} as const;
