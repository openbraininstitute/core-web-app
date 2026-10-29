import { cache } from 'react';

import { getTaskActivities } from '@/api/entitycore/queries/task';
import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { CircuitExtractionCampaign } from '@/entity-configuration/domain/extraction/extraction-campaign';
import { BuildSynaptomeCampaign } from '@/entity-configuration/domain/model/build-synaptome-campaign';
import { CircuitSynapticPhysiologyCampaign } from '@/entity-configuration/domain/model/circuit-synaptic-physiology-campaign';
import { EmSynapseMappingCampaign } from '@/entity-configuration/domain/model/em-synapse-mapping-campaign';
import { Task } from '@/entity-configuration/domain/task-functions';
import { buildCircuitSynapticPhysiologyWorkflow } from '@/features/scan-config/workflow/definitions/build-circuit-synaptic-physiology';
import { buildEmSynapseMappingWorkflow } from '@/features/scan-config/workflow/definitions/build-em-synapse-mapping';
import { buildSynaptomeWorkflow } from '@/features/scan-config/workflow/definitions/build-synaptome';
import { extractCircuitWorkflow } from '@/features/scan-config/workflow/definitions/extract-circuit';

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { WorkspaceContext } from '@/types/common';

/** this execution activity's own config id, read off the `used` entitycore already returned */
function usedConfigId(activity: ITaskActivity | undefined) {
  return activity?.used.find(
    (entity) => (entity.type ?? EntityTypeDict.TaskConfig) === EntityTypeDict.TaskConfig
  )?.id;
}

/**
 * The build/extract workflow campaign a circuit (at any scale) came from, resolved for its
 * scan-config view; `null` when it cannot be traced. A circuit's generating activity can be any
 * of 4 obi-one tasks, each with its own campaign/config domain and workflow definition, so the
 * generating activity's type is looked up first and used to pick the right one.
 *
 * `circuit_simplification__execution` has no workflow definition (out of scope), so it (like any
 * untracked circuit) resolves to `null`.
 *
 * Cached per request (primitive args).
 */
export const resolveCircuitWorkflow = cache(
  async (circuitId: string, virtualLabId: string, projectId: string) => {
    const context: WorkspaceContext = { virtualLabId, projectId };
    const { data: activities } = await getTaskActivities({
      context,
      filters: { generated__id: circuitId, page_size: 1 },
    });
    const activity = activities.at(0);
    const activityType = activity?.task_activity_type;
    // the execution activity's own `used` already carries its config id, so reuse it instead of
    // re-querying `getTaskActivities` for the same activity (now filtered by type)
    const configId = usedConfigId(activity);
    if (!configId) return null;

    if (activityType === TaskActivityType.CircuitExtractionExecution) {
      const campaignId = await Task.campaignIdFromConfigId({
        configId,
        configGenerationType: TaskActivityType.CircuitExtractionConfigGeneration,
        context,
      });
      if (!campaignId) return null;
      const resolved = await CircuitExtractionCampaign.api.query.resolve?.({
        id: campaignId,
        context,
      });
      if (!resolved) return null;
      return {
        extendedType: CircuitExtractionCampaign.extendedType,
        workflow: extractCircuitWorkflow,
        campaignId: resolved.campaign.id,
        entityId: resolved.circuitId,
        form: resolved.config?.form,
      };
    }

    if (activityType === TaskActivityType.BuildSynaptomeExecution) {
      const campaignId = await Task.campaignIdFromConfigId({
        configId,
        configGenerationType: TaskActivityType.BuildSynaptomeConfigGeneration,
        context,
      });
      if (!campaignId) return null;
      const resolved = await BuildSynaptomeCampaign.api.query.resolve?.({
        id: campaignId,
        context,
      });
      if (!resolved) return null;
      return {
        extendedType: BuildSynaptomeCampaign.extendedType,
        workflow: buildSynaptomeWorkflow,
        campaignId: resolved.campaign.id,
        entityId: resolved.sourceEntityId,
        form: resolved.config?.form,
      };
    }

    if (activityType === TaskActivityType.CircuitSynapticPhysiologyExecution) {
      const campaignId = await Task.campaignIdFromConfigId({
        configId,
        configGenerationType: TaskActivityType.CircuitSynapticPhysiologyConfigGeneration,
        context,
      });
      if (!campaignId) return null;
      const resolved = await CircuitSynapticPhysiologyCampaign.api.query.resolve?.({
        id: campaignId,
        context,
      });
      if (!resolved) return null;
      return {
        extendedType: CircuitSynapticPhysiologyCampaign.extendedType,
        workflow: buildCircuitSynapticPhysiologyWorkflow,
        campaignId: resolved.campaign.id,
        entityId: resolved.sourceEntityId,
        form: resolved.config?.form,
      };
    }

    if (activityType === TaskActivityType.EmSynapseMappingExecution) {
      const campaignId = await Task.campaignIdFromConfigId({
        configId,
        configGenerationType: TaskActivityType.EmSynapseMappingConfigGeneration,
        context,
      });
      if (!campaignId) return null;
      const resolved = await EmSynapseMappingCampaign.api.query.resolve?.({
        id: campaignId,
        context,
      });
      if (!resolved) return null;
      return {
        extendedType: EmSynapseMappingCampaign.extendedType,
        workflow: buildEmSynapseMappingWorkflow,
        campaignId: resolved.campaign.id,
        entityId: resolved.sourceEntityId,
        form: resolved.config?.form,
      };
    }

    return null;
  }
);
