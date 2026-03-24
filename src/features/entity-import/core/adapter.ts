import type { ReactNode } from 'react';
import type { ZodType } from 'zod';
import type {
  FlatImportValues,
  ImportCellState,
  ImportFieldDefinition,
  ImportRowState,
  ImportSessionState,
  Suggestion,
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

export const RemoteValidationResultStatus = {
  Valid: 'valid',
  Invalid: 'invalid',
} as const;

export type TRemoteValidationResultStatus =
  (typeof RemoteValidationResultStatus)[keyof typeof RemoteValidationResultStatus];

export interface RemoteValidationResult {
  status: TRemoteValidationResultStatus;
  message?: string | null;
  suggestions?: Array<Suggestion>;
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
  suggestions: Array<Suggestion>;
}

export interface AdapterFieldDefinition extends ImportFieldDefinition {
  placeholder?: string;
  helpText?: string;
  options?: Array<Suggestion>;
  isEnabled?: (values: FlatImportValues) => boolean;
  getDisabledMessage?: (values: FlatImportValues) => string;
  remote?: {
    search?: (args: RemoteSearchArgs) => Promise<Array<Suggestion>>;
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
  applySuggestion: (params: {
    fieldPath: string;
    targetRowId: string;
    sourceValue: string;
    suggestion: Suggestion;
    applyToAllMatching: boolean;
  }) => void;
  chooseSuggestion: (params: { rowId: string; fieldPath: string; suggestion: Suggestion }) => void;
  dismissNotification: (notificationId: string) => void;
  requestSuggestions: (params: {
    rowId: string;
    fieldPath: string;
    query: string;
  }) => Promise<void>;
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
  submitRows: () => Promise<void>;
  updateCellValue: (params: { rowId: string; fieldPath: string; rawValue: string }) => void;
}
