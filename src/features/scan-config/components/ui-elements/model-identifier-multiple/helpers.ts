/**
 * @module helpers
 *
 * parse/serialize, FromID mapping, and browse-cart utilities for
 * `model_identifier_multiple`.
 *
 * config refs use ObiOne FromID types; browse/session use extended entity types
 * workflow {@link TScanConfigConfigureBinding} resolves browse → FromID at confirm time
 */

import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { isPlainObject } from '@/features/scan-config/components/utils';
import {
  acceptedEntityTypesFromField,
  entityTypeForScanConfigFromIdType,
  isScanConfigFromIdTypeValue,
  ModelIdentifierFieldStorageMode,
  resolveModelIdentifierFieldStorageMode,
  scanConfigFromIdTypeForEntityType,
} from '@/features/scan-config/workflow/workflow-schema-selection';
import { getEntityMeta } from '@/ui/segments/workflows/config/helpers';
import { resolveScanConfigFromIdType } from '@/ui/segments/workflows/config/scan-config-binding';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type {
  TFromIdRef,
  TModelIdentifierBrowseSelectionsByType,
  TModelIdentifierConfigurationInput,
  TModelIdentifierGroup,
  TModelIdentifierParsedValue,
} from '@/features/scan-config/components/ui-elements/model-identifier-multiple/types';
import type { ConfigValue } from '@/features/scan-config/types';
import type {
  TWorkflowSessionSelectionPayload,
  TWorkflowSessionSelectionRef,
} from '@/features/scan-config/workflow/workflow-session-selection';
import type { TScanConfigConfigureBinding } from '@/ui/segments/workflows/config/scan-config-binding';
import type { IWorkflowConfigurationInput } from '@/ui/segments/workflows/config/types';

/** type guard for ObiOne FromID ref objects (`type` + non-empty `id_str`). */
export function isFromIdRef(value: unknown): value is TFromIdRef {
  return (
    isPlainObject(value) &&
    typeof value.type === 'string' &&
    typeof value.id_str === 'string' &&
    value.id_str.length > 0
  );
}

/**
 * Type guard to determine if a value conforms to the TModelIdentifierGroup interface.
 *
 * a valid TModelIdentifierGroup object must:
 * - be a plain object.
 * - have a `name` property of type string
 * - have an `elements` property which is an array
 *   where every element in the array satisfies the isFromIdRef type guard
 *
 * @param value - the value being checked.
 * @returns true if the value is a TModelIdentifierGroup, otherwise false
 */
function isNamedGroup(value: unknown): value is TModelIdentifierGroup {
  if (!isPlainObject(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  // check that 'name' is a string and 'elements' is an array of TFromIdRef
  const hasValidName = typeof record.name === 'string';
  const hasValidElements = Array.isArray(record.elements) && record.elements.every(isFromIdRef);

  return hasValidName && hasValidElements;
}

/**
 * parses raw config value + field schema into a typed {@link TModelIdentifierParsedValue}.
 *
 * storage mode (list / tuple / grouped) is derived from schema shape via
 * {@link resolveModelIdentifierFieldStorageMode}.
 *
 * @param value - raw block state value for the model field.
 * @param paramSchema - json schema fragment for the `model_identifier_multiple` property.
 * @returns parsed value with empty defaults when config is missing or invalid.
 */
export function parseModelIdentifierFieldValue(
  value: ConfigValue | undefined,
  paramSchema: Record<string, unknown>
): TModelIdentifierParsedValue {
  const storageMode = resolveModelIdentifierFieldStorageMode(paramSchema);

  if (storageMode === ModelIdentifierFieldStorageMode.Grouped) {
    const groups: TModelIdentifierGroup[] = [];

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (isNamedGroup(entry)) {
          groups.push({
            name: entry.name,
            elements: entry.elements,
          });
        }
      }
    }

    if (groups.length > 0) {
      return { storageMode, groups };
    }

    return { storageMode, groups: [{ name: 'Default name', elements: [] }] };
  }

  const items: TFromIdRef[] = Array.isArray(value)
    ? (value.filter(isFromIdRef) as TFromIdRef[])
    : isFromIdRef(value)
      ? [value]
      : [];

  return {
    storageMode,
    items,
  };
}

/**
 * serializes parsed value back to ObiOne config shape for block state
 *
 * @param parsed - value from {@link parseModelIdentifierFieldValue}
 * @returns config-safe array (flat refs or NamedTuple groups)
 */
export function serializeModelIdentifierFieldValue(
  parsed: TModelIdentifierParsedValue
): ConfigValue {
  if (parsed.storageMode === ModelIdentifierFieldStorageMode.Grouped) {
    return parsed.groups.map((group) => ({
      name: group.name,
      elements: group.elements,
    })) as unknown as ConfigValue;
  }

  return parsed.items as unknown as ConfigValue;
}

/**
 * resolves a config or session ref to an entity-core fetch target
 *
 * accepts either FromID refs (`id_str`) or session refs (`id` + extended type)
 *
 * @returns `{ entityType, id }` or `null` when the ref type cannot be mapped
 */
export function resolveEntityFetchTarget(ref: TFromIdRef | TWorkflowSessionSelectionRef): {
  entityType: TExtendedEntitiesTypeDict;
  id: string;
} | null {
  const id = 'id_str' in ref ? ref.id_str : ref.id;

  if (getEntityByExtendedType({ type: ref.type as TExtendedEntitiesTypeDict })) {
    return { entityType: ref.type as TExtendedEntitiesTypeDict, id };
  }

  if (isScanConfigFromIdTypeValue(ref.type)) {
    const entityType = entityTypeForScanConfigFromIdType(ref.type);
    if (entityType) {
      return { entityType, id };
    }
  }

  return null;
}

/**
 * converts a browse table row to an ObiOne FromID ref for config storage
 *
 * prefers workflow {@link resolveScanConfigFromIdType} when binding is available;
 * falls back to schema-level {@link scanConfigFromIdTypeForEntityType}
 *
 * @returns FromID ref or `null` when no mapping exists for the entity type
 */
export function entityRowToFromIdRef(
  row: EntityCoreIdentifiableNamed,
  entityType: TExtendedEntitiesTypeDict,
  configureBinding?: TScanConfigConfigureBinding
): TFromIdRef | null {
  const fromIdType =
    (configureBinding ? resolveScanConfigFromIdType(configureBinding, entityType) : undefined) ??
    scanConfigFromIdTypeForEntityType(entityType);

  if (!fromIdType) {
    return null;
  }

  return { type: fromIdType, id_str: row.id };
}

/**
 * merges schema `accepted_input_types` with workflow registry configuration inputs
 *
 * schema types take precedence when present; labels/filters come from the registry
 * or {@link getEntityMeta} fallback
 */
export function mergeConfigurationInputs(opts: {
  paramSchema: Record<string, unknown>;
  configurationInputs?: readonly IWorkflowConfigurationInput[];
}): TModelIdentifierConfigurationInput[] {
  const schemaTypes = acceptedEntityTypesFromField(opts.paramSchema);
  const types =
    schemaTypes.length > 0
      ? schemaTypes
      : (opts.configurationInputs?.map((input) => input.type) ?? []);

  return types.map((type) => {
    const registryInput = opts.configurationInputs?.find((input) => input.type === type);

    return {
      type,
      label: registryInput?.label ?? getEntityMeta(type)?.label ?? type,
      filters: registryInput?.filters,
    };
  });
}

/**
 * flattens browse cart selections into FromID refs for config confirm
 *
 * @param selectionsByType - cart state keyed by browse entity type
 * @param configureBinding - optional workflow binding for FromID resolution
 */
export function selectionsByTypeToFromIdRefs(
  selectionsByType: TModelIdentifierBrowseSelectionsByType,
  configureBinding?: TScanConfigConfigureBinding
): TFromIdRef[] {
  const refs: TFromIdRef[] = [];

  for (const [entityType, rows] of Object.entries(selectionsByType)) {
    for (const row of rows ?? []) {
      const ref = entityRowToFromIdRef(
        row,
        entityType as TExtendedEntitiesTypeDict,
        configureBinding
      );
      if (ref) {
        refs.push(ref);
      }
    }
  }

  return refs;
}

/**
 * uppercase badge label from extended entity type (entity-configuration domain title)
 *
 * used in browse cart where selections are keyed by browse entity type
 */
export function getEntityTypeTagLabel(entityType: TExtendedEntitiesTypeDict): string {
  const domainTitle = getEntityByExtendedType({ type: entityType })?.title;
  const label = domainTitle ?? getEntityMeta(entityType)?.label ?? entityType;
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

/** total entity count across all types in the browse cart */
export function countSelectedEntities(
  selectionsByType: TModelIdentifierBrowseSelectionsByType
): number {
  return Object.values(selectionsByType).reduce((sum, rows) => sum + (rows?.length ?? 0), 0);
}

/**
 * extracts flat session refs from workflow browse session payload
 *
 * @param sessionSelection - payload from `sessionStorage` (single / list / grouped)
 */
export function collectWorkflowSessionRefs(
  sessionSelection?: TWorkflowSessionSelectionPayload | null
): TWorkflowSessionSelectionRef[] {
  if (!sessionSelection) {
    return [];
  }

  switch (sessionSelection.mode) {
    case 'single':
      return [sessionSelection.item as TWorkflowSessionSelectionRef];
    case 'list':
      return sessionSelection.items as TWorkflowSessionSelectionRef[];
    case 'grouped':
      return sessionSelection.groups.flatMap(
        (group) => group.items as TWorkflowSessionSelectionRef[]
      );
    default:
      return [];
  }
}

/** collects all FromID refs from a parsed field value (flat or grouped) */
export function getAllRefsFromParsed(parsed: TModelIdentifierParsedValue): TFromIdRef[] {
  if (parsed.storageMode === ModelIdentifierFieldStorageMode.Grouped) {
    return parsed.groups.flatMap((group) => group.elements);
  }

  return parsed.items;
}
