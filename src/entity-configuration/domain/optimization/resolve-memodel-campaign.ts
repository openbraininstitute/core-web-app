import { cache } from 'react';

import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { MEModelBuildCampaign } from '@/entity-configuration/domain/model/memodel-build-campaign';
import { Task } from '@/entity-configuration/domain/task-functions';

import type { WorkspaceContext } from '@/types/common';

/** the build campaign an ME-model came from; `null` when it cannot be traced */
export async function resolveMEModelBuildCampaignId(memodelId: string, context: WorkspaceContext) {
  return await Task.campaignIdOf({
    id: memodelId,
    executionType: TaskActivityType.MEModelBuildExecution,
    configGenerationType: TaskActivityType.MEModelBuildConfigGeneration,
    context,
  });
}

/**
 * The build campaign an ME-model came from, resolved for its scan-config view; `null` when it
 * cannot be traced. Cached per request (primitive args).
 */
export const resolveMEModelBuildCampaign = cache(
  async (memodelId: string, virtualLabId: string, projectId: string) => {
    const context = { virtualLabId, projectId };
    const campaignId = await resolveMEModelBuildCampaignId(memodelId, context);
    if (!campaignId) return null;
    // biome-ignore lint/style/noNonNullAssertion: resolve is defined on the campaign config
    return await MEModelBuildCampaign.api.query.resolve!({ id: campaignId, context });
  }
);
