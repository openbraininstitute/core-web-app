import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { listActivities, listWorkflows } from '@/ui/segments/workflows/config/helpers';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { FeatureFlags } from '@/features/feature-flags/flags';
import type { TActivityValue } from '@/ui/segments/workflows/config/types';

export type TNextStep = {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
  /** "Simulate · Synaptome" */
  label: string;
  legacy: boolean;
};

/**
 * The workflows an entity of `type` can go on to: every enabled workflow, in every activity,
 * whose configuration takes that type. Read from the workflow registry, so a workflow added
 * there shows up here without anything else to change. Legacy ones come last.
 */
export function nextStepsFor(
  type: TExtendedEntitiesTypeDict | string | null | undefined,
  flags?: FeatureFlags
): TNextStep[] {
  if (!type) return [];
  const steps = listActivities(flags).flatMap((activity) =>
    listWorkflows({ activity: activity.value, flags })
      .filter(
        (workflow) =>
          !workflow.disabled &&
          (workflow.configurationInputs?.some((input) => input.type === type) ?? false)
      )
      .map((workflow) => ({
        activity: activity.value,
        targetType: workflow.targetType,
        label: `${activity.label} · ${workflow.label}`,
        legacy: Boolean(workflow.legacy),
      }))
  );
  return [...steps.filter((s) => !s.legacy), ...steps.filter((s) => s.legacy)];
}

const CIRCUIT_TYPE_BY_SCALE: Record<string, TExtendedEntitiesTypeDict> = {
  single: ExtendedEntitiesTypeDict.SingleNeuronCircuit,
  pair: ExtendedEntitiesTypeDict.PairedNeuronCircuit,
  small: ExtendedEntitiesTypeDict.SmallMicrocircuit,
  microcircuit: ExtendedEntitiesTypeDict.Microcircuit,
  region: ExtendedEntitiesTypeDict.BrainRegion,
  whole_brain: ExtendedEntitiesTypeDict.WholeBrain,
};

/**
 * The type the workflows know an entity by: a circuit by its scale (a small microcircuit, a
 * paired-neuron circuit, …), anything else by its own type.
 */
export function workflowTypeOf(entity: {
  type?: string | null;
  scale?: string | null;
}): TExtendedEntitiesTypeDict | undefined {
  if (!entity.type) return undefined;
  if (entity.type === EntityTypeDict.Circuit && entity.scale) {
    return CIRCUIT_TYPE_BY_SCALE[entity.scale] ?? ExtendedEntitiesTypeDict.Circuit;
  }
  return entity.type as TExtendedEntitiesTypeDict;
}
