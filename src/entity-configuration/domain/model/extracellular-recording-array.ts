import {
  getSimulatableExtracellularRecordingArray,
  getSimulatableExtracellularRecordingArrays,
} from '@/api/entitycore/queries/model/simulatable-extracellular-recording-array';
import { discardBrainRegionQueryParams } from '@/api/entitycore/transformers';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { extracellularRecordingArrayBuildFlag } from '@/features/feature-flags/flags';

import type { ISimulatableExtracellularRecordingArray } from '@/api/entitycore/types/entities/simulatable-extracellular-recording-array';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const ExtracellularRecordingArray: EntityCoreTypeConfig<ISimulatableExtracellularRecordingArray> =
  {
    group: EntityTypeGroup.Models,
    title: 'Extracellular recording array',
    extendedType: ExtendedEntitiesTypeDict.SimulatableExtracellularRecordingArray,
    type: EntityTypeDict.SimulatableExtracellularRecordingArray,
    slug: EntitySlug.ExtracellularRecordingArray,
    requiredFeatures: [extracellularRecordingArrayBuildFlag.key],
    api: {
      config: {
        allowedFacets: true,
        ilikeSearchEnabled: true,
      },
      query: {
        list: (...params) => {
          // simulateable extracellular recording arrays are not brain-region aware,
          // so we discard the brain-region filters
          const filters = discardBrainRegionQueryParams(params[0].filters);
          return getSimulatableExtracellularRecordingArrays({
            context: params[0].context,
            withFacets: params[0].withFacets,
            filters,
          });
        },
        one: getSimulatableExtracellularRecordingArray,
      },
    },
    asset: {
      extension: 'application/json',
    },
    // this entity has no full detail page yet, so the data browse only opens the mini-detail panel
    // the "View details" action is hidden for entities without detail sections,
    // see `mini-detail-view/actions/data.tsx`
    detailViewSections: [],
    isBookmarkable: false,
    isDownloadable: true,
    isCopyable: true,
    isSimulatable: false,
  } as const;
