import { getTaskResult, getTaskResults } from '@/api/entitycore/queries/task';
import { TaskResultType } from '@/api/entitycore/types/entities/task-result';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ITaskResult, ITaskResultFilter } from '@/api/entitycore/types/entities/task-result';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

type TEModelOptimizationResult = ITaskResult;

const resultTypeFilter = {
  task_result_type: TaskResultType.EModelOptimizationResult,
} satisfies Partial<ITaskResultFilter>;

async function list(params: {
  withFacets?: boolean;
  filters?: Partial<ITaskResultFilter>;
  context?: WorkspaceContext | null;
}) {
  return await getTaskResults({
    ...params,
    filters: { ...params.filters, ...resultTypeFilter },
  });
}

async function one(params: { id: string; context?: WorkspaceContext | null }) {
  return await getTaskResult(params);
}

/**
 * The task result an e-model optimization run registers: its analysis summary, figures and
 * checkpoint. Listed under Data > Simulations until it gets a home of its own.
 */
export const EModelOptimizationResult: EntityCoreTypeConfig<TEModelOptimizationResult> = {
  group: EntityTypeGroup.Simulations,
  title: 'Optimization TaskResult',
  extendedType: ExtendedEntitiesTypeDict.EModelOptimizationResult,
  type: EntityTypeDict.TaskResult,
  slug: EntitySlug.EModelOptimizationResult,
  api: {
    config: {
      // a task result carries no facetable column of its own
      allowedFacets: false,
      ilikeSearchEnabled: true,
      extraQueryKeyBuilder: resultTypeFilter,
    },
    query: {
      list,
      one,
    },
  },
  asset: { extension: 'application/json' },
  detailViewSections: [DetailViewSectionsDict.Overview],
  isDownloadable: true,
  isBookmarkable: false,
  isCopyable: true,
  isSimulatable: false,
} as const;
