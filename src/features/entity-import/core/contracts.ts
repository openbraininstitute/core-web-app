export const ImportInputType = {
  Text: 'text',
  Textarea: 'textarea',
  Number: 'number',
  Date: 'date',
  Select: 'select',
  RemoteSelect: 'remote-select',
  File: 'file',
  FileBundle: 'file-bundle',
  Compound: 'compound',
} as const;

export type TImportInputType = (typeof ImportInputType)[keyof typeof ImportInputType];

export const CellStatus = {
  Idle: 'idle',
  Valid: 'valid',
  Invalid: 'invalid',
  Disabled: 'disabled',
} as const;

export type TCellStatus = (typeof CellStatus)[keyof typeof CellStatus];

export const DependencyState = {
  Ready: 'ready',
  Blocked: 'blocked',
} as const;

export type TDependencyState = (typeof DependencyState)[keyof typeof DependencyState];

export const RemoteValidationStatus = {
  Idle: 'idle',
  Pending: 'pending',
  Valid: 'valid',
  Invalid: 'invalid',
} as const;

export type TRemoteValidationStatus =
  (typeof RemoteValidationStatus)[keyof typeof RemoteValidationStatus];

export const RowStatus = {
  Idle: 'idle',
  Valid: 'valid',
  Invalid: 'invalid',
} as const;

export type TRowStatus = (typeof RowStatus)[keyof typeof RowStatus];

export const NotificationTone = {
  Info: 'info',
  Warning: 'warning',
  Error: 'error',
  Success: 'success',
} as const;

export type TNotificationTone = (typeof NotificationTone)[keyof typeof NotificationTone];

export interface ISuggestion {
  value: string;
  label: string;
  description?: string;
  recommended?: boolean;
  metadata?: Record<string, unknown>;
}

export interface IImportFieldCsvConfig {
  include?: boolean;
  aliases?: Array<string>;
}

/**
 * rich seed for manual table rows (same information as a hydrated CSV cell).
 * lets remote/select columns show a label while submitting `rawValue`.
 */
export interface IImportManualCellSeed {
  rawValue: string;
  displayValue?: string | null;
  parsedValue?: unknown;
}

/**
 * default used only for **manual** grid rows: first empty row, add row, clear row.
 * not merged for rows supplied explicitly (e.g. CSV upload); an empty cell in a file stays empty.
 */
export type TImportManualDefault = string | IImportManualCellSeed;

export interface IImportFieldDefinition {
  label: string;
  path: string;
  submissionPath?: string;
  validationPath?: string;
  required: boolean;
  inputType: TImportInputType;
  dependencies?: Array<string>;
  csv?: IImportFieldCsvConfig;
  /** when set, table column uses this width (px) and prefers it over auto layout. */
  columnWidth?: number;
  /** See {@link TImportManualDefault}. */
  manualDefault?: TImportManualDefault;
}

export interface IRemoteSuggestionPaging {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export interface IRemoteState {
  status: TRemoteValidationStatus;
  suggestions: Array<ISuggestion>;
  selectedSuggestion: ISuggestion | null;
  message: string | null;
  /** present when remote search supports pagination (validator load more). */
  suggestionPaging?: IRemoteSuggestionPaging;
}

export interface CellCorrectionDraft {
  previousRawValue: string;
  previousDisplayValue: string | null;
  previousParsedValue: unknown;
  previousRemoteState: IRemoteState;
  suggestion: ISuggestion;
}

export interface IImportCellState {
  fieldPath: string;
  rawValue: string;
  displayValue: string | null;
  parsedValue: unknown;
  status: TCellStatus;
  issues: Array<string>;
  dependencyState: TDependencyState;
  remoteState: IRemoteState;
  /** staged remote suggestion; raw value stays as user-entered until accept. */
  correctionDraft: CellCorrectionDraft | null;
}

export interface IImportRowState {
  id: string;
  rowIndex: number;
  lookupContext: {
    selectedSpecies: ISuggestion | null;
  };
  cells: Record<string, IImportCellState>;
  rowStatus: TRowStatus;
}

export interface ISessionSummary {
  canSubmit: boolean;
  invalidRequiredCellCount: number;
}

export interface ISelectedCellState {
  rowId: string;
  fieldPath: string;
}

export const ENTITY_IMPORT_ALL_COLUMNS = '__all__';

export interface IValidatorSelectionState {
  rowId: string | null;
  fieldPath: string | null;
}

export interface ISessionNotification {
  id: string;
  tone: TNotificationTone;
  message: string;
}

export interface IImportSessionState {
  fields: Array<IImportFieldDefinition>;
  rows: Array<IImportRowState>;
  selectedCell: ISelectedCellState | null;
  validatorSelection: IValidatorSelectionState;
  validatorScrollFieldPath: string | null;
  validatorScrollRequestVersion: number;
  notifications: Array<ISessionNotification>;
  summary: ISessionSummary;
}

export const ImportRowResultStatus = {
  Idle: 'idle',
  Pending: 'pending',
  Succeeded: 'succeeded',
  Failed: 'failed',
} as const;

export type TImportRowResultStatus =
  (typeof ImportRowResultStatus)[keyof typeof ImportRowResultStatus];

export interface IImportRowResultState {
  status: TImportRowResultStatus;
  errorMessage: string | null;
}

export interface IImportFailureCard {
  rowId: string;
  rowNumber: number;
  message: string;
}

export const ImportRunPhase = {
  Idle: 'idle',
  Running: 'running',
  Completed: 'completed',
} as const;

export type TImportRunPhase = (typeof ImportRunPhase)[keyof typeof ImportRunPhase];

export interface IImportRunState {
  phase: TImportRunPhase;
  totalRowCount: number;
  completedRowCount: number;
  succeededRowCount: number;
  failedRowCount: number;
  rowResults: Record<string, IImportRowResultState>;
  failureCards: Array<IImportFailureCard>;
}

export type TFlatImportValues = Record<string, string>;

export function createIdleRemoteState(): IRemoteState {
  return {
    status: RemoteValidationStatus.Idle,
    suggestions: [],
    selectedSuggestion: null,
    message: null,
  };
}

export function createIdleImportRunState(): IImportRunState {
  return {
    phase: ImportRunPhase.Idle,
    totalRowCount: 0,
    completedRowCount: 0,
    succeededRowCount: 0,
    failedRowCount: 0,
    rowResults: {},
    failureCards: [],
  };
}
