import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { isFromIdRef, type TFromIdRef } from '@/features/scan-config/helpers';
import {
  type Config,
  type ConfigSchema,
  type ConfigValue,
  isType,
  ScanConfigUIElementDict,
  type SchemaName,
  type TBlockElement,
} from '@/features/scan-config/types';
import {
  ScanConfigFromIdType,
  type TScanConfigFromIdType,
} from '@/features/scan-config/workflow/scan-config-from-id-type';

const scanConfigFromIdTypeToEntityType = {
  [ScanConfigFromIdType.CellMorphologyFromID]: ExtendedEntitiesTypeDict.UniversalCellMorphology,
  [ScanConfigFromIdType.MEModelFromID]: ExtendedEntitiesTypeDict.Memodel,
  [ScanConfigFromIdType.CircuitFromID]: ExtendedEntitiesTypeDict.Circuit,
  [ScanConfigFromIdType.EMCellMeshFromID]: ExtendedEntitiesTypeDict.EMCellMesh,
  [ScanConfigFromIdType.MEModelWithSynapsesCircuitFromID]:
    ExtendedEntitiesTypeDict.SingleNeuronCircuit,
  [ScanConfigFromIdType.IonChannelModelFromID]: ExtendedEntitiesTypeDict.IonChannelModel,
} as const satisfies Record<TScanConfigFromIdType, TExtendedEntitiesTypeDict>;

function isScanConfigFromIdType(value: string): value is TScanConfigFromIdType {
  return value in scanConfigFromIdTypeToEntityType;
}

function mapScanConfigFromIdTypesToEntityTypes(
  fromIdTypes: readonly string[]
): readonly TExtendedEntitiesTypeDict[] {
  const mapped: TExtendedEntitiesTypeDict[] = [];

  for (const fromIdType of fromIdTypes) {
    if (!isScanConfigFromIdType(fromIdType)) {
      continue;
    }

    const entityType = scanConfigFromIdTypeToEntityType[fromIdType];
    if (!mapped.includes(entityType)) {
      mapped.push(entityType);
    }
  }

  return mapped;
}

const WorkflowBrowseTableSelection = {
  Checkbox: 'checkbox',
  None: undefined,
} as const;

/** How many entities the workflow `/new` page collects before configure. */
export const WorkflowSchemaSelectionMode = {
  None: 'none',
  Single: 'single',
  Multiple: 'multiple',
  Grouped: 'grouped',
} as const;

type TWorkflowInitializeModelUiElement =
  | typeof ScanConfigUIElementDict.ModelIdentifier
  | typeof ScanConfigUIElementDict.ModelIdentifierMultiple;

type TWorkflowSchemaSelectionBase = {
  schemaName?: SchemaName;
  acceptedFromIdTypes: readonly string[];
};

/** No `model_identifier` field under `initialize` — configure-only. */
export type TWorkflowSchemaSelectionNone = TWorkflowSchemaSelectionBase & {
  uiElement: null;
  selectionMode: typeof WorkflowSchemaSelectionMode.None;
  tableSelectionType: typeof WorkflowBrowseTableSelection.None;
};

/** `model_identifier` — pick one entity on `/new`. */
export type TWorkflowSchemaSelectionSingle = TWorkflowSchemaSelectionBase & {
  uiElement: typeof ScanConfigUIElementDict.ModelIdentifier;
  selectionMode: typeof WorkflowSchemaSelectionMode.Single;
  tableSelectionType: typeof WorkflowBrowseTableSelection.None;
};

/** `model_identifier_multiple` — flat multi-select on `/new`. */
export type TWorkflowSchemaSelectionMultiple = TWorkflowSchemaSelectionBase & {
  uiElement: typeof ScanConfigUIElementDict.ModelIdentifierMultiple;
  selectionMode: typeof WorkflowSchemaSelectionMode.Multiple;
  acceptedEntityTypes: readonly TExtendedEntitiesTypeDict[];
  tableSelectionType: typeof WorkflowBrowseTableSelection.Checkbox;
};

/** `model_identifier_multiple` with grouped NamedTuple shape. */
export type TWorkflowSchemaSelectionGrouped = TWorkflowSchemaSelectionBase & {
  uiElement: typeof ScanConfigUIElementDict.ModelIdentifierMultiple;
  selectionMode: typeof WorkflowSchemaSelectionMode.Grouped;
  acceptedEntityTypes: readonly TExtendedEntitiesTypeDict[];
  tableSelectionType: typeof WorkflowBrowseTableSelection.Checkbox;
};

export type TWorkflowSchemaSelection =
  | TWorkflowSchemaSelectionNone
  | TWorkflowSchemaSelectionSingle
  | TWorkflowSchemaSelectionMultiple
  | TWorkflowSchemaSelectionGrouped;

function isModelIdentifierUiElement(
  uiElement: unknown
): uiElement is TWorkflowInitializeModelUiElement {
  return (
    uiElement === ScanConfigUIElementDict.ModelIdentifier ||
    uiElement === ScanConfigUIElementDict.ModelIdentifierMultiple
  );
}

function readAcceptedFromIdTypes(property: Record<string, unknown>): readonly string[] {
  const explicit = property.accepted_input_types;
  if (Array.isArray(explicit)) {
    return explicit.filter((value): value is string => typeof value === 'string');
  }

  return collectFromIdTypeConsts(property);
}

/**
 * recursively collects known ObiOne FromID type strings from a JSON Schema fragment.
 *
 * walks nested objects and arrays under a model field property, looking for
 * `{ type: "string", const: "<FromID>" }` nodes whose `const` is recognized by
 * {@link isScanConfigFromIdType}. Used as a fallback when `accepted_input_types`
 * is not declared explicitly on the schema property.
 *
 * @param value - Root schema fragment to traverse (typically a model field property).
 * @param results - Accumulator for deduplicated FromID const values across recursive calls.
 * @returns Deduplicated list of accepted FromID type strings found in `value`.
 *
 * @example
 * ```ts
 * // Discriminator branch with CircuitFromID const
 * collectFromIdTypeConsts(modelFieldSchema);
 * // => ["CircuitFromID"]
 * ```
 */
function collectFromIdTypeConsts(value: unknown, results: Set<string> = new Set()): string[] {
  if (!value || typeof value !== 'object') {
    return [...results];
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectFromIdTypeConsts(item, results);
    }
    return [...results];
  }

  const record = value as Record<string, unknown>;

  if (
    record.type === 'string' &&
    typeof record.const === 'string' &&
    isScanConfigFromIdType(record.const)
  ) {
    results.add(record.const);
  }

  for (const nested of Object.values(record)) {
    collectFromIdTypeConsts(nested, results);
  }

  return [...results];
}

// NOTE: we must find a better way to determine if the schema has a NamedTuple shape
// checking by stringifying the schema and checking for the word "NamedTuple"
// is not a good idea because it will fail if the schema is not a string or is not valid JSON
// will ask James to help with this
function hasNamedTupleShape(property: Record<string, unknown>): boolean {
  return JSON.stringify(property).includes('NamedTuple');
}

// NOTE: we must find a better way to determine if the schema has a Tuple shape
// same as hasNamedTupleShape
function hasTupleShape(property: Record<string, unknown>): boolean {
  const serialized = JSON.stringify(property);
  if (serialized.includes('NamedTuple')) {
    return false;
  }

  return serialized.includes('prefixItems') || serialized.includes('"tuple"');
}

export const ModelIdentifierFieldStorageMode = {
  List: 'list',
  Tuple: 'tuple',
  Grouped: 'grouped',
} as const;

export type TModelIdentifierFieldStorageMode =
  (typeof ModelIdentifierFieldStorageMode)[keyof typeof ModelIdentifierFieldStorageMode];

export function resolveModelIdentifierFieldStorageMode(
  paramSchema: Record<string, unknown>
): TModelIdentifierFieldStorageMode {
  if (hasNamedTupleShape(paramSchema)) {
    return ModelIdentifierFieldStorageMode.Grouped;
  }

  if (hasTupleShape(paramSchema)) {
    return ModelIdentifierFieldStorageMode.Tuple;
  }

  return ModelIdentifierFieldStorageMode.List;
}

export function entityTypeForScanConfigFromIdType(
  fromIdType: string
): TExtendedEntitiesTypeDict | undefined {
  if (!isScanConfigFromIdType(fromIdType)) {
    return undefined;
  }

  return scanConfigFromIdTypeToEntityType[fromIdType];
}

export function acceptedEntityTypesFromField(
  paramSchema: Record<string, unknown>
): readonly TExtendedEntitiesTypeDict[] {
  return mapScanConfigFromIdTypesToEntityTypes(readAcceptedFromIdTypes(paramSchema));
}

export function isScanConfigFromIdTypeValue(value: string): value is TScanConfigFromIdType {
  return isScanConfigFromIdType(value);
}

export function scanConfigFromIdTypeForEntityType(
  entityType: TExtendedEntitiesTypeDict
): string | undefined {
  for (const [fromIdType, mappedEntityType] of Object.entries(scanConfigFromIdTypeToEntityType)) {
    if (mappedEntityType === entityType) {
      return fromIdType;
    }
  }

  return undefined;
}

/**
 * Locates the scan-config `initialize` field that accepts a workflow entity selection.
 *
 * Inspects direct children of `schema.properties.initialize` (expected to be a
 * `block_single` block) and returns the **first** property whose `ui_element` is
 * `model_identifier` or `model_identifier_multiple`. Schemas are assumed to define
 * at most one such field; the returned `key` is the JSON path used in campaign
 * config (for example `circuit`, not a fixed `model_identifier` name).
 *
 * @param schema - Dereferenced ObiOne scan-config JSON schema.
 * @returns The property name and schema fragment when a model field exists; otherwise `null`
 *   when `initialize` is missing, is not a `block_single`, or has no model selector field.
 *
 * @example
 * ```ts
 * const modelProperty = findInitializeModelProperty(schema);
 * if (modelProperty) {
 *   const { key, field } = modelProperty;
 *   // key: "circuit", field.ui_element: "model_identifier"
 * }
 * ```
 */
export function findInitializeModelProperty(schema: ConfigSchema): {
  key: string;
  field: TBlockElement & { ui_element: TWorkflowInitializeModelUiElement };
} | null {
  const initialize = schema.properties?.initialize;
  if (!initialize || initialize.ui_element !== ScanConfigUIElementDict.BlockSingle) {
    return null;
  }

  for (const [key, property] of Object.entries(initialize.properties)) {
    if (isType(property)) {
      continue;
    }

    if (isModelIdentifierUiElement(property.ui_element)) {
      return {
        key,
        field: property as TBlockElement & { ui_element: TWorkflowInitializeModelUiElement },
      };
    }
  }

  return null;
}

function collectFromIdRefsFromModelFieldValue(value: ConfigValue | undefined): TFromIdRef[] {
  if (isFromIdRef(value)) {
    return [value];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  const refs: TFromIdRef[] = [];

  for (const entry of value) {
    if (isFromIdRef(entry)) {
      refs.push(entry);
      continue;
    }

    if (isPlainObject(entry) && typeof entry.name === 'string' && Array.isArray(entry.elements)) {
      for (const element of entry.elements) {
        if (isFromIdRef(element)) {
          refs.push(element);
        }
      }
    }
  }

  return refs;
}

/**
 * resolves the primary entity id stored under the schema's initialize model field
 *
 * used when configure opens from an origin campaign (`?origin=`) without workflow session
 * selection, the saved form is authoritative for grouped inputs, but `model_identifier`
 * still needs a fetched entity for the middle column
 */
export function resolvePrimaryEntityIdFromConfigForm(
  schema: ConfigSchema,
  config: Config | undefined
): string | undefined {
  const modelProperty = findInitializeModelProperty(schema);
  if (!modelProperty || !config) {
    return undefined;
  }

  const initialize = config.initialize;
  if (!initialize || typeof initialize !== 'object' || Array.isArray(initialize)) {
    return undefined;
  }

  const modelFieldValue = initialize[modelProperty.key as keyof typeof initialize] as
    | ConfigValue
    | undefined;

  return collectFromIdRefsFromModelFieldValue(modelFieldValue).at(0)?.id_str;
}

/**
 * Maps schema UI element + property shape to {@link WorkflowSchemaSelectionMode}.
 *
 * - `model_identifier` → `single`
 * - `model_identifier_multiple` + NamedTuple → `grouped`
 * - `model_identifier_multiple` otherwise → `multiple`
 */
function resolveSelectionMode(
  uiElement: TWorkflowInitializeModelUiElement,
  property: Record<string, unknown>
):
  | typeof WorkflowSchemaSelectionMode.Single
  | typeof WorkflowSchemaSelectionMode.Multiple
  | typeof WorkflowSchemaSelectionMode.Grouped {
  if (uiElement === ScanConfigUIElementDict.ModelIdentifier) {
    return WorkflowSchemaSelectionMode.Single;
  }

  if (hasNamedTupleShape(property)) {
    return WorkflowSchemaSelectionMode.Grouped;
  }

  return WorkflowSchemaSelectionMode.Multiple;
}

function noWorkflowSchemaSelection(schemaName: SchemaName): TWorkflowSchemaSelectionNone {
  return {
    schemaName,
    uiElement: null,
    selectionMode: WorkflowSchemaSelectionMode.None,
    acceptedFromIdTypes: [],
    tableSelectionType: WorkflowBrowseTableSelection.None,
  };
}

function buildModelFieldSelection(opts: {
  schemaName: SchemaName;
  modelField: TBlockElement & { ui_element: TWorkflowInitializeModelUiElement };
  acceptedFromIdTypes: readonly string[];
}): TWorkflowSchemaSelection {
  const propertyRecord = opts.modelField as unknown as Record<string, unknown>;
  const selectionMode = resolveSelectionMode(opts.modelField.ui_element, propertyRecord);

  if (selectionMode === WorkflowSchemaSelectionMode.Single) {
    return {
      schemaName: opts.schemaName,
      uiElement: ScanConfigUIElementDict.ModelIdentifier,
      selectionMode,
      acceptedFromIdTypes: opts.acceptedFromIdTypes,
      tableSelectionType: WorkflowBrowseTableSelection.None,
    };
  }

  return {
    schemaName: opts.schemaName,
    uiElement: ScanConfigUIElementDict.ModelIdentifierMultiple,
    selectionMode,
    acceptedFromIdTypes: opts.acceptedFromIdTypes,
    acceptedEntityTypes: mapScanConfigFromIdTypesToEntityTypes(opts.acceptedFromIdTypes),
    tableSelectionType: WorkflowBrowseTableSelection.Checkbox,
  };
}

/** Arguments for {@link parseWorkflowSchemaSelection}. */
export type TParseWorkflowSchemaSelectionParams = {
  /** Dereferenced ObiOne scan-config JSON schema document. */
  schema: ConfigSchema;
  /** Schema component name used to load `schema` (stored on the result for traceability). */
  schemaName: SchemaName;
};

/**
 * Derives workflow browse selection behavior from a scan-config schema `initialize` block.
 *
 * Inspects direct children of `schema.properties.initialize` (expected to be a
 * `block_single`) and uses the **first** field whose `ui_element` is either
 * `model_identifier` or `model_identifier_multiple`. Schemas are assumed to define
 * at most one such field.
 *
 * When no model field is found, returns {@link WorkflowSchemaSelectionMode.None}
 * with empty accepted types.
 *
 * **Selection mode resolution**
 * | Schema field | Mode |
 * |--------------|------|
 * | `model_identifier` | `single` → table selection `none` |
 * | `model_identifier_multiple` (flat) | `multiple` → table `checkbox` |
 * | `model_identifier_multiple` (NamedTuple) | `grouped` → table `checkbox` per group |
 *
 * Accepted entity types are resolved from `accepted_input_types` or embedded
 * `from_id` const values via {@link mapScanConfigFromIdTypesToEntityTypes}.
 *
 * @param params - Loaded schema and its ObiOne schema name.
 * @returns {@link TWorkflowSchemaSelection} consumed by workflow browse UI.
 *
 * @example
 * ```ts
 * const selectionConfig = parseWorkflowSchemaSelection({ schema, schemaName });
 *
 * if (selectionConfig.selectionMode === WorkflowSchemaSelectionMode.Grouped) {
 *   // show multi-table browse with grouped configure payload
 * }
 * ```
 */
export function parseWorkflowSchemaSelection({
  schema,
  schemaName,
}: TParseWorkflowSchemaSelectionParams): TWorkflowSchemaSelection {
  const modelProperty = findInitializeModelProperty(schema);
  if (!modelProperty) {
    return noWorkflowSchemaSelection(schemaName);
  }

  const propertyRecord = modelProperty.field as unknown as Record<string, unknown>;

  return buildModelFieldSelection({
    schemaName,
    modelField: modelProperty.field,
    acceptedFromIdTypes: readAcceptedFromIdTypes(propertyRecord),
  });
}
