import type { ReactNode } from 'react';
import type { ZodType } from 'zod';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type {
  IImportCellState,
  IImportFieldCsvConfig,
  IImportFieldDefinition,
  IImportRowState,
  IImportSessionState,
  IRemoteState,
  ISuggestion,
  TFlatImportValues,
} from '@/features/entity-import/core/contracts';

export interface IEntityImportRuntimeContext {
  projectId: string;
  virtualLabId: string;
  sessionId?: string;
}

export interface RemoteSearchArgs {
  query: string;
  row: IImportRowState;
  values: TFlatImportValues;
  context: IEntityImportRuntimeContext;
}

export interface IRemoteValidationArgs extends RemoteSearchArgs {
  value: string;
}

/** Page size for validator remote suggestions (first page + load more). */
export const ENTITY_IMPORT_REMOTE_SUGGESTION_PAGE_SIZE = 5;

export interface IRemoteSearchPageResult {
  suggestions: Array<ISuggestion>;
  /** Offset for the next page, or null when there are no more results. */
  nextPageParam: number | null;
}

export type IRemoteSearchPagedArgs = RemoteSearchArgs & {
  pageParam: number;
  pageSize: number;
};

export const RemoteValidationResultStatus = {
  Valid: 'valid',
  Invalid: 'invalid',
} as const;

export type TRemoteValidationResultStatus =
  (typeof RemoteValidationResultStatus)[keyof typeof RemoteValidationResultStatus];

export interface IRemoteValidationResult {
  status: TRemoteValidationResultStatus;
  message?: string | null;
  suggestions?: Array<ISuggestion>;
  resolvedSuggestion?: ISuggestion | null;
}

export interface ITableCellRendererProps {
  field: IAdapterFieldDefinition;
  cell: IImportCellState;
  row: IImportRowState;
  session: IImportSessionState;
  context: IEntityImportRuntimeContext;
  actions: IEntityImportActions;
  validatorPreview?: IValidatorDraftValue | null;
}

export interface IValidatorDraftValue {
  rawValue: string;
  displayValue: string | null;
  parsedValue: unknown;
}

export interface IValidatorPreviewState extends IValidatorDraftValue {
  rowId: string | null;
  fieldPath: string | null;
}

export function createIdleValidatorPreviewState(): IValidatorPreviewState {
  return {
    rowId: null,
    fieldPath: null,
    rawValue: '',
    displayValue: null,
    parsedValue: undefined,
  };
}

export interface IValidatorFieldRendererProps extends ITableCellRendererProps {
  suggestions: Array<ISuggestion>;
  draftValue: IValidatorDraftValue;
  onDraftChange: (value: IValidatorDraftValue) => void;
}

export interface ICsvHydratedCellValue {
  rawValue: string;
  displayValue?: string | null;
  parsedValue?: unknown;
}

export interface ICsvFieldHydrationArgs {
  rawValue: string;
  row: TFlatImportValues;
  context: IEntityImportRuntimeContext;
  importCache?: Map<string, unknown>;
}

export interface IAdapterFieldValidationArgs {
  cell: IImportCellState;
  row: IImportRowState;
  values: TFlatImportValues;
}

export interface IValidatorSuggestionDetailsArgs {
  suggestion: ISuggestion;
  cell: IImportCellState;
  row: IImportRowState;
  values: TFlatImportValues;
}

export interface IAdapterFieldCsvConfig extends IImportFieldCsvConfig {
  hydrateCell?: (
    args: ICsvFieldHydrationArgs
  ) => Promise<ICsvHydratedCellValue> | ICsvHydratedCellValue;
  backgroundHydrateCell?: (
    args: ICsvFieldHydrationArgs
  ) => Promise<ICsvHydratedCellValue> | ICsvHydratedCellValue;
}

export interface IImportFileFieldConfig {
  accept?: Array<string>;
  allowedExtensions?: Array<string>;
  maxSizeBytes?: number;
  maxFiles?: number;
  buttonLabel?: string;
}

export interface IValidatorSuggestionState extends IRemoteState {
  rowId: string | null;
  fieldPath: string | null;
  query: string;
}

export interface IEntityImportTemplateGuideConfig {
  entityType: TExtendedEntitiesTypeDict;
  guideFileName: string;
}

export interface IAdapterFieldEnablementArgs {
  values: TFlatImportValues;
  row: IImportRowState;
}

export const ValidatorManualApplyMode = {
  Commit: 'commit' as const,
  Stage: 'stage' as const,
} as const;

export type TValidatorManualApplyMode =
  (typeof ValidatorManualApplyMode)[keyof typeof ValidatorManualApplyMode];

/**
 * Extended field definition used by import adapters.
 *
 * Adds adapter-specific behavior on top of the base `IImportFieldDefinition`:
 * custom renderers, remote validation, CSV hydration, file constraints, and
 * conditional enablement logic.
 */
export interface IAdapterFieldDefinition extends IImportFieldDefinition {
  /** Placeholder text shown in empty input cells and validator inputs. */
  placeholder?: string;

  /** Descriptive help text displayed alongside the field in the validator panel. */
  helpText?: string;

  /**
   * Controls how manual edits from the validator panel are applied.
   * - `'commit'` (default): writes the value directly to the cell.
   * - `'stage'`: stages the value as a correction draft that the user must
   *   accept or reject per row before it takes effect.
   */
  validatorManualApplyMode?: TValidatorManualApplyMode;

  /** CSV-specific configuration: column aliases, hydration hooks, background hydration. */
  csv?: IAdapterFieldCsvConfig;

  /**
   * Static suggestion list for select-type fields.
   * Also used as local fallback candidates during remote suggestion lookups.
   */
  options?: Array<ISuggestion>;

  /**
   * Render additional detail content below a suggestion item in the validator panel.
   * Useful for showing metadata, descriptions, or previews for each suggestion.
   */
  validatorSuggestionDetails?: (args: IValidatorSuggestionDetailsArgs) => ReactNode;

  /** File upload constraints: accepted MIME types, extensions, max size, max count. */
  fileConfig?: IImportFileFieldConfig;

  /**
   * Dynamic enablement predicate. When it returns `false`, the cell is disabled
   * and shows a blocked state. Evaluated during validation with the current
   * row values.
   */
  isEnabled?: (args: IAdapterFieldEnablementArgs) => boolean;

  /**
   * Custom message shown when the field is disabled by `isEnabled` returning false.
   * Falls back to a generic dependency message if not provided.
   */
  getDisabledMessage?: (args: IAdapterFieldEnablementArgs) => string;

  /**
   * Return additional validation issues beyond what the Zod schema catches.
   * Issues are merged with schema errors and remote validation messages.
   */
  getValidationIssues?: (args: IAdapterFieldValidationArgs) => Array<string>;

  /**
   * Remote validation and suggestion configuration.
   * Fields with `remote` are validated against an external API (e.g. brain region
   * lookup, subject resolution) and can provide paginated suggestion results.
   */
  remote?: {
    /**
     * When true (default), a resolved suggestion from `evaluate` is automatically
     * accepted without requiring the user to pick from the suggestion list.
     * Set to false to always show the suggestion list even when a match is found.
     */
    autoResolveResolvedSuggestion?: boolean;

    /**
     * Paginated remote search for the validator panel's suggestion list.
     * Called when the user types in the validator input or requests more results.
     */
    query?: (args: IRemoteSearchPagedArgs) => Promise<IRemoteSearchPageResult>;

    /**
     * Remote constraint evaluation for a cell value.
     * Called after CSV upload and after inline edits to determine whether the
     * value is valid, invalid, or can be resolved to a known suggestion.
     */
    evaluate?: (args: IRemoteValidationArgs) => Promise<IRemoteValidationResult>;
  };

  /**
   * Custom table cell renderer. Replaces the default `InlineCell` for this field.
   * Used by compound fields like `location` and `contributions` that need
   * specialized display logic in the table.
   */
  tableRenderer?: (props: ITableCellRendererProps) => ReactNode;

  /**
   * Custom validator panel renderer. Replaces the default input/suggestion UI
   * for this field in the validator side panel.
   */
  panelRenderer?: (props: IValidatorFieldRendererProps) => ReactNode;
}

export interface ISubmitRowArgs<TPayload> {
  payload: TPayload;
  row: IImportRowState;
  values: TFlatImportValues;
  context: IEntityImportRuntimeContext;
}

/**
 * Adapter configuration for a specific entity type's import workflow.
 *
 * Each adapter defines the field schema, validation rules, CSV template,
 * payload construction, and row submission logic for one importable entity
 * type (e.g. cell morphology). The controller is generic over the adapter's
 * payload and result types.
 *
 * @typeParam TPayload - The validated payload shape passed to `submitRow`.
 * @typeParam TResult - The return type of a successful `submitRow` call.
 */
export interface IEntityImportAdapter<TPayload = unknown, TResult = unknown> {
  /** Unique identifier for this adapter. Used in query keys and cache scoping. */
  id: string;

  /** Display title shown in the import shell header. */
  title: string;

  /** Optional description shown below the title. */
  description?: string;

  /** Label for the submit button. Defaults to "Import" when not provided. */
  submitLabel?: string;

  /** File name used when the user downloads the CSV template. */
  templateFileName: string;

  /** Configuration for the downloadable import guide (entity type + file name). */
  templateGuide?: IEntityImportTemplateGuideConfig;

  /** Ordered list of field definitions that define the import table columns. */
  fields: Array<IAdapterFieldDefinition>;

  /**
   * Zod schema used to validate each row before submission.
   * Receives the output of `buildPayload` and produces field-level issues
   * that are mapped back to individual cells.
   */
  schema: ZodType<TPayload>;

  /**
   * Factory for a blank row's default values. Called when the user adds a new
   * row or when a row is cleared. Returns a flat key-value map of field paths
   * to default raw values. When not provided, all fields default to empty strings.
   */
  createBlankRow?: () => TFlatImportValues;

  /**
   * Transform a row's cell values into the validated payload shape expected
   * by the Zod schema and `submitRow`. Called during validation and before
   * submission.
   */
  buildPayload: (args: {
    row: IImportRowState;
    values: TFlatImportValues;
    context: IEntityImportRuntimeContext;
  }) => TPayload;

  /**
   * Submit a single validated row to the backend.
   * Called concurrently for each row during the import run, with concurrency
   * controlled by the controller's submit queue limit.
   */
  submitRow: (args: ISubmitRowArgs<TPayload>) => Promise<TResult>;
}

/**
 * Action interface exposed by the import controller to UI components
 *
 * each method corresponds to a user-initiated or system-initiated mutation
 * on the import session. Actions handle validation, state transitions, and
 * side effects (remote lookups, file parsing, etc.) internally.
 */
export interface IEntityImportActions {
  /** Append a new empty row at the end of the import table. */
  addRow: () => void;

  /**
   * Accept a staged correction draft on a cell.
   * Commits the draft suggestion as the cell's resolved value and clears the draft.
   */
  acceptCorrection: (params: { rowId: string; fieldPath: string }) => void;

  /**
   * Reject a staged correction draft on a cell.
   * Restores the cell to its previous value before the draft was staged.
   */
  rejectCorrection: (params: { rowId: string; fieldPath: string }) => void;

  /**
   * Trigger a remote suggestion lookup for a cell in the validator panel.
   * Fetches matching suggestions from the adapter's remote query endpoint
   * and updates the validator suggestion state.
   */
  requestSuggestions: (params: {
    rowId: string;
    fieldPath: string;
    query: string;
  }) => Promise<void>;

  /**
   * Apply a selected suggestion to one or all matching rows.
   *
   * When `applyToAllMatching` is true, every row in the session receives the
   * suggestion for the given field. When `mode` is `'stage'`, the suggestion
   * is staged as a correction draft instead of committed immediately.
   */
  applySuggestion: (params: {
    fieldPath: string;
    targetRowId: string;
    sourceValue: string;
    suggestion: ISuggestion;
    applyToAllMatching: boolean;
    mode?: TValidatorManualApplyMode;
  }) => void;

  /**
   * Resolve a cell to a specific suggestion from the inline suggestion list.
   * Sets the cell's value, display, and remote state to the chosen suggestion.
   */
  chooseSuggestion: (params: { rowId: string; fieldPath: string; suggestion: ISuggestion }) => void;

  /** Reset all cells in a row to their default empty state. */
  clearRow: (rowId: string) => void;

  /** Remove a row from the session and reindex remaining rows. */
  deleteRow: (rowId: string) => void;

  /** Dismiss a session-level notification by its ID. */
  dismissNotification: (notificationId: string) => void;

  /**
   * Fetch the next page of remote suggestions for the current validator
   * selection. Only effective when a paginated remote query is active.
   */
  loadMoreSuggestions: () => void;

  /**
   * Select a cell in the table and synchronize the validator panel to it.
   * Updates both the table highlight and the validator's row/field selection.
   */
  selectCell: (params: { rowId: string; fieldPath: string }) => void;

  /**
   * Update the validator panel's row and/or field selection independently.
   * Pass `null` to clear a dimension; omit a key to leave it unchanged.
   */
  setValidatorSelection: (params: { rowId?: string | null; fieldPath?: string | null }) => void;

  /**
   * Set or clear the validator preview value for a cell.
   * The preview is shown in the table as a pending change before the user
   * commits it via "Apply" or "Apply to all".
   */
  setValidatorPreview: (params: {
    rowId: string;
    fieldPath: string;
    value: IValidatorDraftValue | null;
  }) => void;

  /**
   * Set a cell's value with explicit control over raw, display, and parsed
   * representations. Used by compound and custom-rendered fields that manage
   * their own value shape (e.g. location, contributions).
   */
  setCustomValue: (params: {
    rowId: string;
    fieldPath: string;
    rawValue: string;
    displayValue?: string | null;
    parsedValue?: unknown;
  }) => void;

  /**
   * Set a file-type cell's value from one or more selected files.
   * Validates file constraints (size, extension, count) before committing.
   */
  setFileValue: (params: {
    rowId: string;
    fieldPath: string;
    files: Array<File>;
    displayValue?: string | null;
  }) => void;

  /**
   * Submit all valid rows to the adapter's `submitRow` endpoint.
   * Blocked when `summary.canSubmit` is false or a validator preview is active.
   */
  submitRows: () => void;

  /**
   * Update a primitive cell's raw text value (text, number, date, select).
   * Triggers row-scoped validation and schedules deferred remote sync
   * for fields with remote constraints.
   */
  updateCellValue: (params: { rowId: string; fieldPath: string; rawValue: string }) => void;

  /**
   * Batch-apply a manual value to multiple rows in a single commit.
   * Replaces the per-row loop that previously dispatched N individual actions
   * when the user clicks "Apply to all" in the validator panel.
   */
  applyManualValueToAll: (params: {
    fieldPath: string;
    targetRowIds: Array<string>;
    rawValue: string;
    displayValue?: string | null;
    parsedValue?: unknown;
  }) => void;
}
