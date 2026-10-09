import { cache } from 'react';

import {
  getTaskActivities,
  getTaskConfig,
  getTaskResult,
  getTaskResults,
} from '@/api/entitycore/queries/task';
import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskResultType } from '@/api/entitycore/types/entities/task-result';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EFeatureExtractionCampaign } from '@/entity-configuration/domain/extraction/efeature-extraction-campaign';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { TTaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskResult, ITaskResultFilter } from '@/api/entitycore/types/entities/task-result';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

type TEFeatureExtractionResult = ITaskResult;

const resultTypeFilter = {
  task_result_type: TaskResultType.EFeatureExtractionResult,
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

/** id of the task config an activity of `type` used to generate entity `id` */
export async function usedTaskConfigId(
  id: string,
  type: TTaskActivityType,
  context: WorkspaceContext
) {
  const { data } = await getTaskActivities({
    context,
    filters: { generated__id: id, task_activity_type: type },
  });
  return (
    data
      .flatMap((activity) => activity.used)
      // a ref's type may be absent; executions and generations only use task configs anyway
      .find((entity) => (entity.type ?? EntityTypeDict.TaskConfig) === EntityTypeDict.TaskConfig)
      ?.id ?? null
  );
}

/**
 * A task result has no FK to its campaign, so walk provenance: result → `__execution` activity →
 * config → campaign (`task_config_generator_id`, else the `__config_generation` activity).
 */
export async function resolveEFeatureExtractionCampaignId(id: string, context: WorkspaceContext) {
  const configId = await usedTaskConfigId(
    id,
    TaskActivityType.EFeatureExtractionExecution,
    context
  );
  if (!configId) return null;

  const config = await getTaskConfig({ id: configId, context });
  return (
    config.task_config_generator_id ??
    (await usedTaskConfigId(configId, TaskActivityType.EFeatureExtractionConfigGeneration, context))
  );
}

/**
 * The campaign a result came from, resolved for its scan-config view; `null` when it cannot be
 * traced. Cached per request (primitive args) so the data view layout and overview share it.
 */
export const resolveEFeatureExtractionResultCampaign = cache(
  async (id: string, virtualLabId: string, projectId: string) => {
    const context = { virtualLabId, projectId };
    const campaignId = await resolveEFeatureExtractionCampaignId(id, context);
    if (!campaignId) return null;
    // biome-ignore lint/style/noNonNullAssertion: resolve is defined on the campaign config
    return await EFeatureExtractionCampaign.api.query.resolve!({
      id: campaignId,
      context,
    });
  }
);

export const EFeatureExtractionResult: EntityCoreTypeConfig<TEFeatureExtractionResult> = {
  group: EntityTypeGroup.Experimental,
  title: 'Intracellular e-feature extraction',
  extendedType: ExtendedEntitiesTypeDict.EFeatureExtractionResult,
  type: EntityTypeDict.TaskResult,
  slug: EntitySlug.EFeatureExtractionResult,
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
