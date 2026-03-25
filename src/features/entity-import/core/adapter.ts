import type { ReactNode } from 'react';
import type { ZodType } from 'zod';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type {
  IImportCellState,
  IImportFieldDefinition,
  IImportRowState,
  IImportSessionState,
  ISuggestion,
  TFlatImportValues,
} from '@/features/entity-import/core/contracts';

export interface EntityImportRuntimeContext {
  projectId: string;
  virtualLabId: string;
  sessionId?: string;
}

export interface RemoteSearchArgs {
  query: string;
  row: IImportRowState;
  values: TFlatImportValues;
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
  resolvedSuggestion?: ISuggestion | null;
}

export interface TableCellRendererProps {
  field: AdapterFieldDefinition;
  cell: IImportCellState;
  row: IImportRowState;
  session: IImportSessionState;
  context: EntityImportRuntimeContext;
  actions: EntityImportActions;
}

export interface ValidatorDraftValue {
  rawValue: string;
  displayValue: string | null;
  parsedValue: unknown;
}

export interface ValidatorFieldRendererProps extends TableCellRendererProps {
  suggestions: Array<ISuggestion>;
  draftValue: ValidatorDraftValue;
  onDraftChange: (value: ValidatorDraftValue) => void;
}

export interface ImportFileFieldConfig {
  accept?: Array<string>;
  allowedExtensions?: Array<string>;
  maxSizeBytes?: number;
  maxFiles?: number;
  buttonLabel?: string;
}

export interface EntityImportTemplateGuideConfig {
  entityType: TExtendedEntitiesTypeDict;
  guideFileName: string;
}

export interface AdapterFieldEnablementArgs {
  values: TFlatImportValues;
  row: IImportRowState;
}

export interface AdapterFieldDefinition extends IImportFieldDefinition {
  placeholder?: string;
  helpText?: string;
  options?: Array<ISuggestion>;
  fileConfig?: ImportFileFieldConfig;
  isEnabled?: (args: AdapterFieldEnablementArgs) => boolean;
  getDisabledMessage?: (args: AdapterFieldEnablementArgs) => string;
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
  row: IImportRowState;
  values: TFlatImportValues;
  context: EntityImportRuntimeContext;
}

export interface EntityImportAdapter<TPayload = unknown, TResult = unknown> {
  id: string;
  title: string;
  description?: string;
  submitLabel?: string;
  templateFileName: string;
  templateGuide?: EntityImportTemplateGuideConfig;
  fields: Array<AdapterFieldDefinition>;
  schema: ZodType<TPayload>;
  createBlankRow?: () => TFlatImportValues;
  buildPayload: (args: {
    row: IImportRowState;
    values: TFlatImportValues;
    context: EntityImportRuntimeContext;
  }) => TPayload;
  submitRow: (args: SubmitRowArgs<TPayload>) => Promise<TResult>;
}

export interface EntityImportActions {
  addRow: () => void;
  acceptCorrection: (params: { rowId: string; fieldPath: string }) => void;
  rejectCorrection: (params: { rowId: string; fieldPath: string }) => void;
  requestSuggestions: (params: {
    rowId: string;
    fieldPath: string;
    query: string;
  }) => Promise<void>;
  applySuggestion: (params: {
    fieldPath: string;
    targetRowId: string;
    sourceValue: string;
    suggestion: ISuggestion;
    applyToAllMatching: boolean;
  }) => void;
  chooseSuggestion: (params: { rowId: string; fieldPath: string; suggestion: ISuggestion }) => void;
  clearRow: (rowId: string) => void;
  deleteRow: (rowId: string) => void;
  dismissNotification: (notificationId: string) => void;
  loadMoreSuggestions: () => void;
  selectCell: (params: { rowId: string; fieldPath: string }) => void;
  setValidatorSelection: (params: { rowId?: string | null; fieldPath?: string | null }) => void;
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
    files: Array<File>;
    displayValue?: string | null;
  }) => void;
  submitRows: () => void;
  updateCellValue: (params: { rowId: string; fieldPath: string; rawValue: string }) => void;
}
