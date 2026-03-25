import type { ReactNode } from 'react';
import type { ZodType } from 'zod';
import type {
  FlatImportValues,
  ImportCellState,
  ImportFieldDefinition,
  ImportRowState,
  ImportSessionState,
  ISuggestion,
} from './contracts';

export interface EntityImportRuntimeContext {
  projectId: string;
  virtualLabId: string;
  sessionId?: string;
}

export interface RemoteSearchArgs {
  query: string;
  row: ImportRowState;
  values: FlatImportValues;
  context: EntityImportRuntimeContext;
}

export interface RemoteValidationArgs extends RemoteSearchArgs {
  value: string;
}

/** Page size for validator remote suggestions (first page + load more). */
export const ENTITY_IMPORT_REMOTE_SUGGESTION_PAGE_SIZE = 5;

export interface RemoteSearchPageResult {
  suggestions: Array<ISuggestion>;
  /** Offset for the next page, or null when there are no more results. */
  nextPageParam: number | null;
}

export type RemoteSearchPagedArgs = RemoteSearchArgs & {
  pageParam: number;
  pageSize: number;
};

export const RemoteValidationResultStatus = {
  Valid: 'valid',
  Invalid: 'invalid',
} as const;

export type TRemoteValidationResultStatus =
  (typeof RemoteValidationResultStatus)[keyof typeof RemoteValidationResultStatus];

export interface RemoteValidationResult {
  status: TRemoteValidationResultStatus;
  message?: string | null;
  suggestions?: Array<ISuggestion>;
}

export interface TableCellRendererProps {
  field: AdapterFieldDefinition;
  cell: ImportCellState;
  row: ImportRowState;
  session: ImportSessionState;
  context: EntityImportRuntimeContext;
  actions: EntityImportActions;
}

export interface ValidatorFieldRendererProps extends TableCellRendererProps {
  suggestions: Array<ISuggestion>;
}

export interface AdapterFieldDefinition extends ImportFieldDefinition {
  placeholder?: string;
  helpText?: string;
  options?: Array<ISuggestion>;
  isEnabled?: (values: FlatImportValues) => boolean;
  getDisabledMessage?: (values: FlatImportValues) => string;
  remote?: {
    search?: (args: RemoteSearchArgs) => Promise<Array<ISuggestion>>;
    /** Prefer this for server-backed lists; enables infinite query + load more in the validator. */
    searchPage?: (args: RemoteSearchPagedArgs) => Promise<RemoteSearchPageResult>;
    validate?: (args: RemoteValidationArgs) => Promise<RemoteValidationResult>;
  };
  tableRenderer?: (props: TableCellRendererProps) => ReactNode;
  panelRenderer?: (props: ValidatorFieldRendererProps) => ReactNode;
}

export interface SubmitRowArgs<TPayload> {
  payload: TPayload;
  row: ImportRowState;
  values: FlatImportValues;
  context: EntityImportRuntimeContext;
}

export interface EntityImportAdapter<TPayload = unknown, TResult = unknown> {
  id: string;
  title: string;
  description?: string;
  submitLabel?: string;
  templateFileName: string;
  fields: Array<AdapterFieldDefinition>;
  schema: ZodType<TPayload>;
  createBlankRow?: () => FlatImportValues;
  buildPayload: (args: {
    row: ImportRowState;
    values: FlatImportValues;
    context: EntityImportRuntimeContext;
  }) => TPayload;
  submitRow: (args: SubmitRowArgs<TPayload>) => Promise<TResult>;
}

export interface EntityImportActions {
  addRow: () => void;
  acceptCorrection: (params: { rowId: string; fieldPath: string }) => void;
  applySuggestion: (params: {
    fieldPath: string;
    targetRowId: string;
    sourceValue: string;
    suggestion: ISuggestion;
    applyToAllMatching: boolean;
  }) => void;
  chooseSuggestion: (params: { rowId: string; fieldPath: string; suggestion: ISuggestion }) => void;
  dismissNotification: (notificationId: string) => void;
  rejectCorrection: (params: { rowId: string; fieldPath: string }) => void;
  requestSuggestions: (params: {
    rowId: string;
    fieldPath: string;
    query: string;
  }) => Promise<void>;
  loadMoreSuggestions: () => void;
  selectCell: (params: { rowId: string; fieldPath: string }) => void;
  setCustomValue: (params: {
    rowId: string;
    fieldPath: string;
    rawValue: string;
    displayValue?: string | null;
    parsedValue?: unknown;
  }) => void;
  setFileValue: (params: {
    rowId: string;
    fieldPath: string;
    file: File | null;
    displayValue?: string | null;
  }) => void;
  submitRows: () => void;
  updateCellValue: (params: { rowId: string; fieldPath: string; rawValue: string }) => void;
}
