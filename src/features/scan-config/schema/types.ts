import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ScanConfigUIElementDict, SchemaName } from '@/features/scan-config/types';

export const TableSelectionType = {
  Radio: 'radio',
  Checkbox: 'checkbox',
  None: undefined,
} as const;

export type TTableSelectionType = (typeof TableSelectionType)[keyof typeof TableSelectionType];

/**
 * how many entities a workflow browse page lets the user pick before configure
 *
 * parsed from the scan-config schema `initialize` block via
 * {@link parseInitializeSelection} and merged with workflow `configurationInputs`
 * in {@link resolveWorkflowBrowseSelectionConfig}
 */
export const WorkflowInitializeSelectionMode = {
  /** no entity picker; browse selection is disabled or handled elsewhere */
  None: 'none',
  /** exactly one entity (`model_identifier` → table radio) */
  Single: 'single',
  /** many entities in one flat list (`model_identifier_multiple` → table checkbox) */
  Multiple: 'multiple',
  /** many entities grouped by input/type (NamedTuple shape → table checkbox per group) */
  Grouped: 'grouped',
} as const;

/** union of {@link WorkflowInitializeSelectionMode} string values */
export type TWorkflowInitializeSelectionMode =
  (typeof WorkflowInitializeSelectionMode)[keyof typeof WorkflowInitializeSelectionMode];

/**
 * scan-config UI elements that declare model/entity selection in `initialize`
 *
 * @see ScanConfigUIElementDict.ModelIdentifier — single selection
 * @see ScanConfigUIElementDict.ModelIdentifierMultiple — multi or grouped selection
 */
export type TWorkflowInitializeModelUiElement =
  | typeof ScanConfigUIElementDict.ModelIdentifier
  | typeof ScanConfigUIElementDict.ModelIdentifierMultiple;

/**
 * resolved rules for entity selection on workflow browse (`/workflows/.../new/...`)
 *
 * drives table control type, accepted entity types, and how selections are serialized
 * for the configure page (single ref, flat list, or grouped payload).
 */
export type TWorkflowSelectionConfig = {
  /** ObiOne schema this config was derived from, when applicable */
  schemaName?: SchemaName;
  /** `initialize` model field UI element, or `null` when selection is disabled */
  uiElement: TWorkflowInitializeModelUiElement | null;
  /** number/shape of entities the user must or may select */
  selectionMode: TWorkflowInitializeSelectionMode;
  /** raw `from_id` type strings accepted by the schema model field */
  acceptedFromIdTypes: readonly string[];
  /** extended entity types the browse tables may list for this workflow */
  acceptedEntityTypes: readonly TExtendedEntitiesTypeDict[];
  /**
   * Ant Design table row selection control.
   * `radio` for single, `checkbox` for multiple/grouped, `undefined` when mode is `none`
   */
  tableSelectionType: TTableSelectionType | undefined;
};
