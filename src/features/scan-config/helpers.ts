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

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

/**
 * Maps scan config activities to their AI agent state configuration names.
 * Used to sync configuration state with the AI assistant for different activities.
 */
export const ACTIVITY_AI_CONFIG_MAP: Record<TScanConfigActivity, string> = {
  [ScanConfigActivity.Simulate]: 'smc_simulation_config',
  [ScanConfigActivity.Extract]: 'smc_extraction_config',
  [ScanConfigActivity.Process]: 'smc_skeletonization_config',
  [ScanConfigActivity.Build]: 'smc_build_config',
};

export const ScanConfigCampaignOriginActionDict = {
  View: 'view',
  Duplicate: 'duplicate',
  Task: 'task',
} as const;

export type TScanConfigCampaignOriginActionDict =
  (typeof ScanConfigCampaignOriginActionDict)[keyof typeof ScanConfigCampaignOriginActionDict];

/** query param for resume/duplicate flows (`?origin={campaignId}`). */
export const ScanConfigOriginSearchParam = 'origin' as const;

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
