import { getTaskResult, getTaskResults } from '@/api/entitycore/queries/task';
import { TaskResultType } from '@/api/entitycore/types/entities/task-result';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type {
  ITaskResult,
  ITaskResultFilter,
  TTaskResultType,
} from '@/api/entitycore/types/entities/task-result';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

function makeAindEphysResult({
  title,
  extendedType,
  slug,
  taskResultType,
}: {
  title: string;
  extendedType: TExtendedEntitiesTypeDict;
  slug: EntitySlugValue;
  taskResultType: TTaskResultType;
}): EntityCoreTypeConfig<ITaskResult> {
  const resultTypeFilter = {
    task_result_type: taskResultType,
  } satisfies Partial<ITaskResultFilter>;

  return {
    group: EntityTypeGroup.Experimental,
    title,
    extendedType,
    type: EntityTypeDict.TaskResult,
    slug,
    api: {
      config: {
        // a task result carries no facetable column of its own
        allowedFacets: false,
        ilikeSearchEnabled: true,
        extraQueryKeyBuilder: resultTypeFilter,
      },
      query: {
        list: async (params: {
          withFacets?: boolean;
          filters?: Partial<ITaskResultFilter>;
          context?: WorkspaceContext | null;
        }) =>
          getTaskResults({
            ...params,
            filters: { ...params.filters, ...resultTypeFilter },
          }),
        one: getTaskResult,
      },
    },
    asset: { extension: 'application/vnd.directory' },
    detailViewSections: [DetailViewSectionsDict.Overview],
    isDownloadable: true,
    isBookmarkable: false,
    isCopyable: true,
    isSimulatable: false,
  };
}

export const AindEphysPreprocessingResult = makeAindEphysResult({
  title: 'Preprocessed extracellular recording',
  extendedType: ExtendedEntitiesTypeDict.AindEphysPreprocessingResult,
  slug: EntitySlug.AindEphysPreprocessingResult,
  taskResultType: TaskResultType.AindEphysPreprocessingResult,
});

export const AindEphysSpikeSortingResult = makeAindEphysResult({
  title: 'Sorted spikes',
  extendedType: ExtendedEntitiesTypeDict.AindEphysSpikeSortingResult,
  slug: EntitySlug.AindEphysSpikeSortingResult,
  taskResultType: TaskResultType.AindEphysSpikesortingResult,
});
