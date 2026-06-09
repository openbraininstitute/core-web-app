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

import z from 'zod';

import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { EntityTypeCatalog } from '@/ui/segments/workflows/config/entity-types';

import { entityTypeForScanConfigFromIdType } from './workflow/workflow-schema-selection';

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
  if (entityType === ExtendedEntitiesTypeDict.SingleNeuronCircuit) {
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

/** query param for resume/duplicate flows (`?origin={campaignId}`). */
export const ScanConfigOriginSearchParam = 'origin' as const;

/** query param flagging the editor mode, e.g. `?mode=duplicate` to open editable. */
export const ScanConfigModeSearchParam = 'mode' as const;

export function parseScanConfigMode(
  value: string | string[] | undefined
): TScanConfigCampaignOriginActionDict | undefined {
  return Object.values(ScanConfigCampaignOriginActionDict).find((action) => action === value);
}

/** obiOne FromID reference written under an `initialize` model field */
export type TFromIdRef = {
  /** fromID const string (e.g. `CellMorphologyFromID`) */
  type: string;
  /** entity uuid */
  id_str: string;
};

/** type guard for ObiOne FromID ref objects (`type` + non-empty `id_str`). */
export function isFromIdRef(value: unknown): value is TFromIdRef {
  return (
    isPlainObject(value) &&
    typeof value.type === 'string' &&
    typeof value.id_str === 'string' &&
    z.uuid().safeParse(value.id_str).success
  );
}

/**
 * uppercase badge label from extended entity type (entity-configuration domain title)
 *
 * used in browse cart where selections are keyed by browse entity type
 */
export function getEntityTypeTagLabel(entityType: TExtendedEntitiesTypeDict): string {
  const domainTitle = getEntityByExtendedType({ type: entityType })?.title;
  const label = domainTitle ?? EntityTypeCatalog[entityType]?.label ?? entityType;
  return label.replace(/\s+/g, ' ').toUpperCase();
}

/**
 * uppercase badge label derived from a stored FromID ref (summary column)
 *
 * maps FromID → entity type via schema rules, not session storage types
 */
export function getFromIdRefTypeBadgeLabel(ref: TFromIdRef): string {
  const entityType = entityTypeForScanConfigFromIdType(ref.type);
  if (entityType) {
    return getEntityTypeTagLabel(entityType);
  }

  const domainTitle = getEntityByExtendedType({
    type: ref.type as TExtendedEntitiesTypeDict,
  })?.title;
  if (domainTitle) {
    return domainTitle.toUpperCase();
  }

  return ref.type.replace(/_/g, ' ').toUpperCase();
}
