import { cache } from 'react';

import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { EModelOptimizationCampaign } from '@/entity-configuration/domain/optimization/emodel-optimization-campaign';
import { Task } from '@/entity-configuration/domain/task-functions';

import type { WorkspaceContext } from '@/types/common';

/** the optimisation campaign an e-model came from; `null` when it cannot be traced */
export async function resolveEModelOptimizationCampaignId(
  emodelId: string,
  context: WorkspaceContext
) {
  return await Task.campaignIdOf({
    id: emodelId,
    executionType: TaskActivityType.EModelOptimizationExecution,
    configGenerationType: TaskActivityType.EModelOptimizationConfigGeneration,
    context,
  });
}

/**
 * The optimisation campaign an e-model came from, resolved for its scan-config view; `null` when
 * it cannot be traced. Cached per request (primitive args).
 */
export const resolveEModelOptimizationCampaign = cache(
  async (emodelId: string, virtualLabId: string, projectId: string) => {
    const context = { virtualLabId, projectId };
    const campaignId = await resolveEModelOptimizationCampaignId(emodelId, context);
    if (!campaignId) return null;
    // biome-ignore lint/style/noNonNullAssertion: resolve is defined on the campaign config
    return await EModelOptimizationCampaign.api.query.resolve!({ id: campaignId, context });
  }
);
