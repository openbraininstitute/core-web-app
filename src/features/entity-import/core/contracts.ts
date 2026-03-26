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

export interface IImportFieldDefinition {
  label: string;
  path: string;
  submissionPath?: string;
  validationPath?: string;
  required: boolean;
  inputType: TImportInputType;
  dependencies?: Array<string>;
  csv?: IImportFieldCsvConfig;
  /** When set, table column uses this width (px) and prefers it over auto layout. */
  columnWidth?: number;
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
  /** Present when remote search supports pagination (validator load more). */
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
  /** Staged remote suggestion; raw value stays as user-entered until accept. */
  correctionDraft: CellCorrectionDraft | null;
}

export interface IImportRowState {
  id: string;
  rowIndex: number;
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
  notifications: Array<ISessionNotification>;
  summary: ISessionSummary;
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
