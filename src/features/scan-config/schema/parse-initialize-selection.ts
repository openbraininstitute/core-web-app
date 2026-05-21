import {
  isKnownFromIdType,
  mapFromIdTypesToExtendedEntityTypes,
} from '@/features/scan-config/schema/from-id-types';
import {
  TableSelectionType,
  type TWorkflowInitializeModelUiElement,
  type TWorkflowSelectionConfig,
  WorkflowInitializeSelectionMode,
} from '@/features/scan-config/schema/types';
import {
  type ConfigSchema,
  isType,
  ScanConfigUIElementDict,
  type SchemaName,
  type TBlockElement,
} from '@/features/scan-config/types';

/** returns whether `uiElement` is a schema field that declares model/entity selection */
function isModelIdentifierUiElement(
  uiElement: unknown
): uiElement is TWorkflowInitializeModelUiElement {
  return (
    uiElement === ScanConfigUIElementDict.ModelIdentifier ||
    uiElement === ScanConfigUIElementDict.ModelIdentifierMultiple
  );
}

/**
 * reads accepted `from_id` type strings from a model field property
 * prefers explicit `accepted_input_types`; otherwise walks JSON Schema `const` values
 */
function readAcceptedFromIdTypes(property: Record<string, unknown>): string[] {
  const explicit = property.accepted_input_types;
  if (Array.isArray(explicit)) {
    return explicit.filter((value): value is string => typeof value === 'string');
  }

  return collectFromIdTypeConsts(property);
}

/** recursively collects known `from_id` type `const` strings from nested schema fragments */
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
    isKnownFromIdType(record.const)
  ) {
    results.add(record.const);
  }

  for (const nested of Object.values(record)) {
    collectFromIdTypeConsts(nested, results);
  }

  return [...results];
}

/** detects grouped selection when the property JSON references a Python `NamedTuple` shape */
function hasNamedTupleShape(property: Record<string, unknown>): boolean {
  const serialized = JSON.stringify(property);
  return serialized.includes('NamedTuple');
}

/**
 * finds the first `model_identifier` or `model_identifier_multiple` child of `initialize`
 * returns `null` when `initialize` is missing or not a `block_single` container
 */
function findInitializeModelField(
  schema: ConfigSchema
): (TBlockElement & { ui_element: TWorkflowInitializeModelUiElement }) | null {
  const initialize = schema.properties?.initialize;
  if (!initialize || initialize.ui_element !== ScanConfigUIElementDict.BlockSingle) {
    return null;
  }

  for (const property of Object.values(initialize.properties)) {
    if (isType(property)) {
      continue;
    }

    if (isModelIdentifierUiElement(property.ui_element)) {
      return property as TBlockElement & { ui_element: TWorkflowInitializeModelUiElement };
    }
  }

  return null;
}

/**
 * maps schema UI element + property shape to {@link WorkflowInitializeSelectionMode}
 *
 * - `model_identifier` → `single`
 * - `model_identifier_multiple` + NamedTuple → `grouped`
 * - `model_identifier_multiple` otherwise → `multiple`
 */
function resolveSelectionMode(
  uiElement: TWorkflowInitializeModelUiElement,
  property: Record<string, unknown>
): TWorkflowSelectionConfig['selectionMode'] {
  if (uiElement === ScanConfigUIElementDict.ModelIdentifier)
    return WorkflowInitializeSelectionMode.Single;
  if (hasNamedTupleShape(property)) return WorkflowInitializeSelectionMode.Grouped;
  return WorkflowInitializeSelectionMode.Multiple;
}

/** maps {@link WorkflowInitializeSelectionMode} to Ant Design table row selection type */
function resolveTableSelectionType(
  selectionMode: TWorkflowSelectionConfig['selectionMode']
): TWorkflowSelectionConfig['tableSelectionType'] {
  switch (selectionMode) {
    case WorkflowInitializeSelectionMode.Single:
      // for single selection, we are using the mini-details-view
      // "use model" button to configure the entity
      return TableSelectionType.None;
    case WorkflowInitializeSelectionMode.Multiple:
    case WorkflowInitializeSelectionMode.Grouped:
      return TableSelectionType.Checkbox;
    default:
      return TableSelectionType.None;
  }
}

/** default config when the schema has no selectable model field in `initialize` */
function noSelection(schemaName?: SchemaName): TWorkflowSelectionConfig {
  return {
    schemaName,
    uiElement: null,
    selectionMode: WorkflowInitializeSelectionMode.None,
    acceptedFromIdTypes: [],
    acceptedEntityTypes: [],
    tableSelectionType: TableSelectionType.None,
  };
}

/** arguments for {@link parseSchemaInitializeSelection} */
export type TParseInitializeSelectionParams = {
  /** dereferenced ObiOne scan-config JSON schema document */
  schema: ConfigSchema;
  /** schema component name used to load `schema` (stored on the result for traceability) */
  schemaName: SchemaName;
};

/**
 * derives workflow browse selection behavior from a scan-config schema `initialize` block
 *
 * inspects direct children of `schema.properties.initialize` (expected to be a
 * `block_single`) and uses the **first** field whose `ui_element` is either
 * `model_identifier` or `model_identifier_multiple`. schemas are assumed to define
 * at most one such field
 *
 * when no model field is found, returns {@link WorkflowInitializeSelectionMode.None}
 * with empty accepted types
 *
 * **Selection mode resolution**
 * | Schema field | Mode |
 * |--------------|------|
 * | `model_identifier` | `single` → table `radio` |
 * | `model_identifier_multiple` (flat) | `multiple` → table `checkbox` |
 * | `model_identifier_multiple` (NamedTuple) | `grouped` → table `checkbox` per group |
 *
 * accepted entity types are resolved from `accepted_input_types` or embedded
 * `from_id` const values via {@link mapFromIdTypesToExtendedEntityTypes}
 *
 * @param params - loaded schema and its ObiOne schema name
 * @returns {@link TWorkflowSelectionConfig} consumed by workflow browse UI and
 *   consumed by workflow browse UI via {@link useWorkflowSelectionConfig}
 *
 * @example
 * ```ts
 * const { schema, schemaName } = await loadScanConfigSchema('EMSynapseMappingWorkflow');
 * const selectionConfig = parseInitializeSelection({ schema, schemaName });
 *
 * if (selectionConfig.selectionMode === WorkflowInitializeSelectionMode.Grouped) {
 *   // show multi-table browse with grouped configure payload
 * }
 * ```
 */
export function parseSchemaInitializeSelection({
  schema,
  schemaName,
}: TParseInitializeSelectionParams): TWorkflowSelectionConfig {
  const modelField = findInitializeModelField(schema);
  if (!modelField) {
    return noSelection(schemaName);
  }

  const propertyRecord = modelField as unknown as Record<string, unknown>;
  const acceptedFromIdTypes = readAcceptedFromIdTypes(propertyRecord);
  const acceptedEntityTypes = mapFromIdTypesToExtendedEntityTypes(acceptedFromIdTypes);
  const selectionMode = resolveSelectionMode(modelField.ui_element, propertyRecord);

  return {
    schemaName,
    uiElement: modelField.ui_element,
    selectionMode,
    acceptedFromIdTypes,
    acceptedEntityTypes,
    tableSelectionType: resolveTableSelectionType(selectionMode),
  };
}
