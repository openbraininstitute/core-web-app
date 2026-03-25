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
}

export interface ImportFieldCsvConfig {
  include?: boolean;
  aliases?: Array<string>;
}

export interface ImportFieldDefinition {
  label: string;
  path: string;
  submissionPath?: string;
  validationPath?: string;
  required: boolean;
  inputType: TImportInputType;
  dependencies?: Array<string>;
  csv?: ImportFieldCsvConfig;
  /** When set, table column uses this width (px) and prefers it over auto layout. */
  columnWidth?: number;
}

export interface RemoteSuggestionPaging {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export interface RemoteState {
  status: TRemoteValidationStatus;
  suggestions: Array<ISuggestion>;
  selectedSuggestion: ISuggestion | null;
  message: string | null;
  /** Present when remote search supports pagination (validator load more). */
  suggestionPaging?: RemoteSuggestionPaging;
}

export interface CellCorrectionDraft {
  previousRawValue: string;
  previousDisplayValue: string | null;
  suggestion: ISuggestion;
}

export interface ImportCellState {
  fieldPath: string;
  rawValue: string;
  displayValue: string | null;
  parsedValue: unknown;
  status: TCellStatus;
  issues: Array<string>;
  dependencyState: TDependencyState;
  remoteState: RemoteState;
  /** Staged remote suggestion; raw value stays as user-entered until accept. */
  correctionDraft: CellCorrectionDraft | null;
}

export interface ImportRowState {
  id: string;
  rowIndex: number;
  cells: Record<string, ImportCellState>;
  rowStatus: TRowStatus;
}

export interface SessionSummary {
  canSubmit: boolean;
  invalidRequiredCellCount: number;
}

export interface SelectedCellState {
  rowId: string;
  fieldPath: string;
}

export interface SessionNotification {
  id: string;
  tone: TNotificationTone;
  message: string;
}

export interface ImportSessionState {
  fields: Array<ImportFieldDefinition>;
  rows: Array<ImportRowState>;
  selectedCell: SelectedCellState | null;
  notifications: Array<SessionNotification>;
  summary: SessionSummary;
}

export type FlatImportValues = Record<string, string>;

export function createIdleRemoteState(): RemoteState {
  return {
    status: RemoteValidationStatus.Idle,
    suggestions: [],
    selectedSuggestion: null,
    message: null,
  };
}
