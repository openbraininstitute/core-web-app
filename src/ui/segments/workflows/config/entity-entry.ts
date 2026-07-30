import { getEntity } from '@/api/entitycore/queries/general/entity';
import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { getSimulationCampaign } from '@/api/entitycore/queries/simulation/campaign';
import { getTaskConfig } from '@/api/entitycore/queries/task/task-config';
import { EntityTypeDict } from '@/api/entitycore/types';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkflowActivityDictValue } from '@/constants';
import { ScanConfigOriginSearchParam } from '@/features/scan-config/helpers';
import { resolveWorkflowTaskTypeBindings } from '@/features/scan-config/workflow/types';
import { ActivityRegistry } from '@/ui/segments/workflows/config/activities';
import { listActivities, listWorkflows } from '@/ui/segments/workflows/config/helpers';
import {
  buildConfigureUrlForEntity,
  resolveSimulateSourceTypeFromDataView,
} from '@/ui/segments/workflows/config/routes';
import {
  buildWorkflowActivityConfigurationHref,
  buildWorkflowActivityDetailConfigurationHref,
} from '@/ui/segments/workflows/elements/workflow-activity-actions';
import {
  PanelQueryParam,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';

import type { IEntity } from '@/api/entitycore/types/entities/entity';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { FeatureFlags } from '@/features/feature-flags/flags';
import type { WorkspaceContext } from '@/types/common';
import type { IWorkflowDescriptor, TActivityValue } from '@/ui/segments/workflows/config/types';

/**
 * resolves an entity id to the workflow configuration editor that entity belongs to
 *
 * serves links that carry nothing but an id — the Get Started examples on the project home page —
 * where the workflow, the activity, and the shape of the route all have to be inferred
 *
 * resolution order:
 * 1. simulation campaign: the model it ran on gives the source type, which gives the workflow
 * 2. task config: the workflow whose scan-config task bindings share its `<family>__*` type
 * 3. activity output (a type the registry produces and never consumes): reopen its own run
 * 4. source model: a new configure session with the entity pre-selected
 *
 * the first three reopen a stored configuration (`?origin=<id>`, or the entity's detail view for
 * activities that have no scan-config editor), the fourth opens an empty one
 *
 * every decision is read from the workflow registry, so a workflow becomes resolvable as soon as
 * it is registered — `entity-entry.test.ts` holds a coverage guard that fails until a newly
 * registered workflow has a case
 */

type TWorkflowMatch = { activity: TActivityValue; workflow: IWorkflowDescriptor };

/**
 * workflows the user can open, simulate first
 *
 * simulate leads so entities several activities accept (an ME-model is both a build target and a
 * simulation source) keep opening the simulation editor
 *
 * @param flags: the viewer's feature flags; omitted means flag-gated workflows are excluded
 * @returns available workflows paired with the activity they belong to, in match order
 */
function availableWorkflows(flags?: FeatureFlags): TWorkflowMatch[] {
  const activities = listActivities(flags).filter((activity) => !activity.disabled);

  return [
    ...activities.filter(({ value }) => value === WorkflowActivityDictValue.simulate),
    ...activities.filter(({ value }) => value !== WorkflowActivityDictValue.simulate),
  ].flatMap(({ value }) =>
    listWorkflows({ activity: value, flags })
      .filter((workflow) => !workflow.disabled)
      .map((workflow) => ({ activity: value, workflow }))
  );
}

/**
 * first available workflow whose `sourceType`/`targetType` is one of the candidates
 *
 * candidates are in priority order, so a more specific type wins over the raw entity type before
 * activity order is considered
 *
 * @param role: which side of the workflow the candidates are matched against — `sourceType` for an
 *   entity fed into a workflow, `targetType` for one produced by it
 * @param candidates: extended types to try, most specific first (see
 *   {@link resolveEntityTypeCandidates})
 * @returns the match, or `null` when no available workflow uses any candidate in that role
 */
function findWorkflowFor(
  role: 'sourceType' | 'targetType',
  candidates: TExtendedEntitiesTypeDict[],
  flags?: FeatureFlags
): TWorkflowMatch | null {
  const available = availableWorkflows(flags);

  for (const candidate of candidates) {
    const match = available.find(({ workflow }) => workflow[role] === candidate);
    if (match) return match;
  }

  return null;
}

/**
 * true when the registry only ever *produces* this type, never consumes it
 *
 * that is what makes an entity an activity output (a campaign, a simulation result): it carries a
 * stored configuration, so it reopens the editor on its own run instead of seeding a new one.
 * ME-models are produced by build and consumed by simulate, so they are not outputs
 *
 * a `hasMultipleSources` workflow names its own campaign type as `sourceType` (its real inputs come
 * from the scan-config schema), so it does not count as consuming that type
 *
 * asked of the whole registry, feature flags included, because this is what the type *is*, not
 * what the current user can open
 *
 * @returns true when an entity of this type should reopen its own run instead of seeding a new one
 */
function isActivityOutputType(extendedType: TExtendedEntitiesTypeDict): boolean {
  const workflows = Object.values(ActivityRegistry).flatMap((activity) => activity.workflows);

  return (
    workflows.some((workflow) => workflow.targetType === extendedType) &&
    !workflows.some(
      (workflow) => workflow.sourceType === extendedType && !workflow.hasMultipleSources
    )
  );
}

/**
 * entitycore names task-config types `<family>__campaign` / `<family>__config`, and a workflow
 * declares the config side in its scan-config `taskTypeBindings`, so the family is what links a
 * campaign task config back to the workflow that wrote it
 *
 * @returns the family (`circuit_extraction` for `circuit_extraction__campaign`), or the type
 *   unchanged when it does not follow the convention
 */
function taskConfigFamily(taskConfigType: string): string {
  return taskConfigType.split('__')[0] ?? taskConfigType;
}

/**
 * workflows that write a task config of this family, matched through their scan-config bindings
 *
 * bindings are resolved without an entity: the field that varies per entity (the obi-one task type)
 * is not the one read here
 *
 * @returns every match, since a family can be shared — {@link pickWorkflowForTaskConfig} narrows it
 */
function findWorkflowsByTaskConfigType(
  taskConfigType: string,
  flags?: FeatureFlags
): TWorkflowMatch[] {
  const family = taskConfigFamily(taskConfigType);

  return availableWorkflows(flags).filter(({ workflow }) => {
    const bindings = resolveWorkflowTaskTypeBindings(
      workflow.scanConfig?.definition.taskTypeBindings,
      { entity: null }
    );

    return bindings ? taskConfigFamily(bindings.config) === family : false;
  });
}

/**
 * extended types an entity can be matched with, most specific first
 *
 * an entity's core type is not always the type workflows register: ME-models run through the
 * single neuron (beta) workflow as `me_model_circuit`, and circuits carry their workflow identity
 * in `scale` (a single-neuron circuit simulates through a different workflow than a microcircuit)
 *
 * the raw type is kept as a fallback so type-agnostic workflows (circuit extraction, recording
 * arrays) still match
 *
 * @returns one or two extended types, most specific first; circuits cost one extra request because
 *   their scale is not on the base entity
 */
async function resolveEntityTypeCandidates(
  entity: IEntity,
  context: WorkspaceContext
): Promise<TExtendedEntitiesTypeDict[]> {
  const extendedType = entity.type as TExtendedEntitiesTypeDict;
  const scale =
    extendedType === ExtendedEntitiesTypeDict.Circuit
      ? (await getCircuit({ id: entity.id, context })).scale
      : undefined;

  const specific = resolveSimulateSourceTypeFromDataView(extendedType, { scale });

  return specific && specific !== extendedType ? [specific, extendedType] : [extendedType];
}

/**
 * reopens a stored configuration
 *
 * scan-config workflows get the editor with `?origin=<id>` so it loads the run's saved form,
 * legacy ones have no such editor and fall back to the entity's detail view
 *
 * @param entityId: the run to reopen — a campaign, a task config, or another activity output
 * @returns the href, or `null` when the target type has no detail view to fall back to
 */
function buildStoredConfigurationHref({
  match,
  workspace,
  entityId,
}: {
  match: TWorkflowMatch;
  workspace: WorkspaceContext;
  entityId: string;
}): string | null {
  const { activity, workflow } = match;

  if (!workflow.isScanConfig) {
    return buildWorkflowActivityDetailConfigurationHref({
      workspace,
      listEntityType: workflow.targetType,
      rowId: entityId,
    });
  }

  return buildConfigureUrlForEntity({
    activity,
    targetType: workflow.targetType,
    workspace,
    entityId,
    skipSelectionPersist: true,
    query: { [ScanConfigOriginSearchParam]: entityId },
  });
}

/**
 * starts a new configure session with the entity pre-selected as the workflow input
 *
 * simulate also opens on the configuration panel, matching the simulate action on entity pages
 *
 * @param entityId: the model the session is seeded with; its type is the workflow's `sourceType`
 * @returns the href — static-type workflows (ion channel simulation) get a route with no session
 *   id and no pre-selection, because their editor chooses its own entities
 */
function buildNewConfigurationHref({
  match,
  workspace,
  entityId,
}: {
  match: TWorkflowMatch;
  workspace: WorkspaceContext;
  entityId: string;
}): string {
  const { activity, workflow } = match;

  return buildConfigureUrlForEntity({
    activity,
    targetType: workflow.targetType,
    workspace,
    entityId,
    entityType: workflow.sourceType,
    query:
      activity === WorkflowActivityDictValue.simulate
        ? { [PanelQueryParam]: WorkflowSimulatePanels.Configuration }
        : {},
  });
}

/**
 * simulation campaigns identify their workflow through the model they ran on
 * (an ME-model campaign is a single neuron (beta) simulation, a circuit campaign resolves by scale)
 *
 * @returns the configure href with `?origin=`, or `null` when the campaign has no model or that
 *   model belongs to no available workflow
 */
async function resolveSimulationCampaignHref({
  campaignId,
  workspace,
  flags,
}: {
  campaignId: string;
  workspace: WorkspaceContext;
  flags?: FeatureFlags;
}): Promise<string | null> {
  const campaign = await getSimulationCampaign({ id: campaignId, context: workspace });
  if (!campaign.entity_id) return null;

  const model = await getEntity({ id: campaign.entity_id, context: workspace });
  const candidates = await resolveEntityTypeCandidates(model, workspace);
  const match = findWorkflowFor('sourceType', candidates, flags);

  if (!match) return null;

  return buildWorkflowActivityConfigurationHref({
    activity: match.activity,
    listEntityType: match.workflow.targetType,
    workspace,
    row: {
      id: campaign.id,
      type: EntityTypeDict.SimulationCampaign,
      entity_id: campaign.entity_id,
    },
  });
}

/**
 * picks the workflow that ran, when a task family is shared
 *
 * every circuit simulation writes `circuit_simulation__config`, so the family alone cannot tell a
 * microcircuit run from a paired-neuron one — the campaign's first input can, since its entity type
 * is the workflow's source type
 *
 * @param matches: workflows sharing the task family, in match order
 * @param inputId: the campaign's first input, fetched only when the family is ambiguous
 * @returns the workflow whose source type the input matches, falling back to the first match
 */
async function pickWorkflowForTaskConfig({
  matches,
  inputId,
  workspace,
}: {
  matches: TWorkflowMatch[];
  inputId?: string;
  workspace: WorkspaceContext;
}): Promise<TWorkflowMatch | null> {
  if (matches.length <= 1 || !inputId) return matches.at(0) ?? null;

  const input = await getEntity({ id: inputId, context: workspace });
  const candidates = await resolveEntityTypeCandidates(input, workspace);

  return matches.find(({ workflow }) => candidates.includes(workflow.sourceType)) ?? matches[0];
}

/**
 * task-config campaigns (extraction, skeletonization, EM synapse mapping, recording arrays, …)
 *
 * @returns the configure href with `?origin=`, or `null` when no available workflow declares this
 *   task family — a `*__config` type, or one whose workflow is behind a feature flag
 */
async function resolveTaskConfigHref({
  taskConfigId,
  workspace,
  flags,
}: {
  taskConfigId: string;
  workspace: WorkspaceContext;
  flags?: FeatureFlags;
}): Promise<string | null> {
  const taskConfig = await getTaskConfig({ id: taskConfigId, context: workspace });
  const match = await pickWorkflowForTaskConfig({
    matches: findWorkflowsByTaskConfigType(taskConfig.task_config_type, flags),
    inputId: taskConfig.inputs?.at(0)?.id,
    workspace,
  });
  if (!match) return null;

  return buildWorkflowActivityConfigurationHref({
    activity: match.activity,
    listEntityType: match.workflow.targetType,
    workspace,
    row: {
      id: taskConfig.id,
      type: EntityTypeDict.TaskConfig,
      inputs: taskConfig.inputs,
      task_config_type: taskConfig.task_config_type,
    },
  });
}

/**
 * resolves any entity id to the configuration editor of the workflow it belongs to
 *
 * the entity id is the only input: the entity's type decides whether the editor reopens a stored
 * configuration (campaigns and task configs, via `?origin=`) or starts a new configure session
 * with the entity pre-selected (source models)
 *
 * @param entityId: any entitycore id — a campaign, a task config, or a source model
 * @param workspace: virtual lab and project the href is built for, and the context the entity is
 *   read with; public entities resolve from any workspace
 * @param flags: the viewer's feature flags, so a flag-gated workflow is never linked to
 * @returns configure href, or `null` when no available workflow accepts the entity
 *
 * @example
 * const href = await resolveWorkflowConfigureHrefForEntity({
 *   entityId: 'a-simulation-campaign-id',
 *   workspace: { virtualLabId, projectId },
 *   flags,
 * });
 * // /app/virtual-lab/{lab}/{project}/workflows/simulate/configure/me-model-circuit-simulation/wf_…?origin=a-simulation-campaign-id
 */
export async function resolveWorkflowConfigureHrefForEntity({
  entityId,
  workspace,
  flags,
}: {
  entityId: string;
  workspace: WorkspaceContext;
  flags?: FeatureFlags;
}): Promise<string | null> {
  const entity = await getEntity({ id: entityId, context: workspace });

  if (entity.type === EntityTypeDict.SimulationCampaign) {
    return resolveSimulationCampaignHref({ campaignId: entityId, workspace, flags });
  }

  if (entity.type === EntityTypeDict.TaskConfig) {
    return resolveTaskConfigHref({ taskConfigId: entityId, workspace, flags });
  }

  const candidates = await resolveEntityTypeCandidates(entity, workspace);

  const output = findWorkflowFor('targetType', candidates.filter(isActivityOutputType), flags);
  if (output) return buildStoredConfigurationHref({ match: output, workspace, entityId });

  const source = findWorkflowFor('sourceType', candidates, flags);
  if (source) return buildNewConfigurationHref({ match: source, workspace, entityId });

  return null;
}
