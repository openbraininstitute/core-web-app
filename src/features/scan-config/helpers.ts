import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { ScanConfigActivity, type TScanConfigActivity } from '@/features/scan-config/types';

export {
  buildActivityStatusMap,
  findLatestExecutionForEntity,
} from '@/features/task-runner/status';

/**
 * All valid config keys the AI agent state can hold.
 */
export const VALID_AI_CONFIG_KEYS = [
  'circuit_simulation_config',
  'me_model_simulation_config',
  'me_model_with_synapses_simulation_config',
  'ion_channel_model_simulation_config',
  'skeletonization_config',
  'em_synapse_mapping_config',
] as const;

export type TAIConfigKey = (typeof VALID_AI_CONFIG_KEYS)[number];

/**
 * Finds the first valid AI config key that has a non-null value in a state object.
 */
export function findConfigKeyInState(state: Record<string, unknown>): TAIConfigKey | null {
  return VALID_AI_CONFIG_KEYS.find((key) => state[key] != null) ?? null;
}

/**
 * Resolves the correct AI config key for a given entity type and activity.
 * Handles the circuit-scale ambiguity where Circuit + Simulate can map to
 * either circuit_simulation_config or me_model_with_synapses_simulation_config.
 */
export function getConfigKeyForEntity(
  entityType: TExtendedEntitiesTypeDict,
  activity: TScanConfigActivity,
  entity?: { scale?: string }
): TAIConfigKey {
  if (activity === ScanConfigActivity.Process) return 'skeletonization_config';

  // Simulate activity — resolve by entity type
  if (entityType === ExtendedEntitiesTypeDict.MemodelCircuit) {
    return 'me_model_simulation_config';
  }
  if (entityType === ExtendedEntitiesTypeDict.IonChannelModel) {
    return 'ion_channel_model_simulation_config';
  }
  if (entityType === ExtendedEntitiesTypeDict.MEModelWithSynapses) {
    return 'me_model_with_synapses_simulation_config';
  }
  // Circuit type — check scale for synaptome disambiguation
  if (entity?.scale === CircuitScaleDictionary.Single) {
    return 'me_model_with_synapses_simulation_config';
  }
  return 'circuit_simulation_config';
}

export const ScanConfigCampaignOriginActionDict = {
  View: 'view',
  Duplicate: 'duplicate',
  Task: 'task',
} as const;

export type TScanConfigCampaignOriginActionDict =
  (typeof ScanConfigCampaignOriginActionDict)[keyof typeof ScanConfigCampaignOriginActionDict];
