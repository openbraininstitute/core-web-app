import { cache } from 'react';

import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { IonChannelBuildCampaign } from '@/entity-configuration/domain/model/ion-channel-build-campaign';
import { Task } from '@/entity-configuration/domain/task-functions';

/**
 * The build campaign an ion channel model came from, resolved for its scan-config view; `null`
 * when it cannot be traced. Cached per request (primitive args).
 */
export const resolveIonChannelModelingCampaign = cache(
  async (icmId: string, virtualLabId: string, projectId: string) => {
    const context = { virtualLabId, projectId };
    const campaignId = await Task.campaignIdOf({
      id: icmId,
      executionType: TaskActivityType.IonChannelModelingExecution,
      configGenerationType: TaskActivityType.IonChannelModelingConfigGeneration,
      context,
    });
    if (!campaignId) return null;
    // biome-ignore lint/style/noNonNullAssertion: resolve is defined on the campaign config
    return await IonChannelBuildCampaign.api.query.resolve!({ id: campaignId, context });
  }
);
