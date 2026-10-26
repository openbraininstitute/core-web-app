import { cache } from 'react';

import { getTaskResult, getTaskResults } from '@/api/entitycore/queries/task';
import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskResultType } from '@/api/entitycore/types/entities/task-result';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { resolveTaskResultCampaignId } from '@/entity-configuration/domain/simulation/task-result-campaign';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { EModelValidationCampaign } from '@/entity-configuration/domain/validation/emodel-validation-campaign';

import type { ITaskResult, ITaskResultFilter } from '@/api/entitycore/types/entities/task-result';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

type TEModelValidationResult = ITaskResult;

const resultTypeFilter = {
  task_result_type: TaskResultType.OptimizedEModelAnalysisValidationResult,
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
 * The campaign a validation result came from, resolved for its scan-config view; `null` when it
 * cannot be traced. Cached per request (primitive args) so the data view layout and overview
 * share it.
 */
export const resolveEModelValidationResultCampaign = cache(
  async (id: string, virtualLabId: string, projectId: string) => {
    const context = { virtualLabId, projectId };
    const campaignId = await resolveTaskResultCampaignId(id, context, {
      execution: TaskActivityType.EModelValidationExecution,
      configGeneration: TaskActivityType.EModelValidationConfigGeneration,
    });
    if (!campaignId) return null;
    // biome-ignore lint/style/noNonNullAssertion: resolve is defined on the campaign config
    return await EModelValidationCampaign.api.query.resolve!({ id: campaignId, context });
  }
);

/**
 * The task result an e-model validation run registers: its summary and score figures. Listed
 * under Data > Simulations; opening one shows the campaign it came from.
 */
export const EModelValidationResult: EntityCoreTypeConfig<TEModelValidationResult> = {
  group: EntityTypeGroup.Simulations,
  title: 'E-model validation',
  extendedType: ExtendedEntitiesTypeDict.EModelValidationResult,
  type: EntityTypeDict.TaskResult,
  slug: EntitySlug.EModelValidationResult,
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
