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
  field: IAdapterFieldDefinition;
  cell: IImportCellState;
  row: IImportRowState;
  session: IImportSessionState;
  context: EntityImportRuntimeContext;
  actions: IEntityImportActions;
  validatorPreview?: ValidatorDraftValue | null;
}

export interface ValidatorDraftValue {
  rawValue: string;
  displayValue: string | null;
  parsedValue: unknown;
}

export interface IValidatorPreviewState extends ValidatorDraftValue {
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

export interface ValidatorFieldRendererProps extends TableCellRendererProps {
  suggestions: Array<ISuggestion>;
  draftValue: ValidatorDraftValue;
  onDraftChange: (value: ValidatorDraftValue) => void;
}

export interface CsvHydratedCellValue {
  rawValue: string;
  displayValue?: string | null;
  parsedValue?: unknown;
}

export interface CsvFieldHydrationArgs {
  rawValue: string;
  row: TFlatImportValues;
  context: EntityImportRuntimeContext;
  importCache?: Map<string, unknown>;
}

export interface AdapterFieldValidationArgs {
  cell: IImportCellState;
  row: IImportRowState;
  values: TFlatImportValues;
}

export interface ValidatorSuggestionDetailsArgs {
  suggestion: ISuggestion;
  cell: IImportCellState;
  row: IImportRowState;
  values: TFlatImportValues;
}

export interface IAdapterFieldCsvConfig extends IImportFieldCsvConfig {
  hydrateCell?: (
    args: CsvFieldHydrationArgs
  ) => Promise<CsvHydratedCellValue> | CsvHydratedCellValue;
  backgroundHydrateCell?: (
    args: CsvFieldHydrationArgs
  ) => Promise<CsvHydratedCellValue> | CsvHydratedCellValue;
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

export interface IAdapterFieldDefinition extends IImportFieldDefinition {
  placeholder?: string;
  helpText?: string;
  validatorManualApplyMode?: TValidatorManualApplyMode;
  csv?: IAdapterFieldCsvConfig;
  options?: Array<ISuggestion>;
  validatorSuggestionDetails?: (args: ValidatorSuggestionDetailsArgs) => ReactNode;
  fileConfig?: IImportFileFieldConfig;
  isEnabled?: (args: IAdapterFieldEnablementArgs) => boolean;
  getDisabledMessage?: (args: IAdapterFieldEnablementArgs) => string;
  getValidationIssues?: (args: AdapterFieldValidationArgs) => Array<string>;
  remote?: {
    autoResolveResolvedSuggestion?: boolean;
    query?: (args: RemoteSearchPagedArgs) => Promise<RemoteSearchPageResult>;
    evaluate?: (args: RemoteValidationArgs) => Promise<RemoteValidationResult>;
  };
  tableRenderer?: (props: TableCellRendererProps) => ReactNode;
  panelRenderer?: (props: ValidatorFieldRendererProps) => ReactNode;
}

export interface ISubmitRowArgs<TPayload> {
  payload: TPayload;
  row: IImportRowState;
  values: TFlatImportValues;
  context: EntityImportRuntimeContext;
}

export interface IEntityImportAdapter<TPayload = unknown, TResult = unknown> {
  id: string;
  title: string;
  description?: string;
  submitLabel?: string;
  templateFileName: string;
  templateGuide?: IEntityImportTemplateGuideConfig;
  fields: Array<IAdapterFieldDefinition>;
  schema: ZodType<TPayload>;
  createBlankRow?: () => TFlatImportValues;
  buildPayload: (args: {
    row: IImportRowState;
    values: TFlatImportValues;
    context: EntityImportRuntimeContext;
  }) => TPayload;
  submitRow: (args: ISubmitRowArgs<TPayload>) => Promise<TResult>;
}

export interface IEntityImportActions {
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
    mode?: TValidatorManualApplyMode;
  }) => void;
  chooseSuggestion: (params: { rowId: string; fieldPath: string; suggestion: ISuggestion }) => void;
  clearRow: (rowId: string) => void;
  deleteRow: (rowId: string) => void;
  dismissNotification: (notificationId: string) => void;
  loadMoreSuggestions: () => void;
  selectCell: (params: { rowId: string; fieldPath: string }) => void;
  setValidatorSelection: (params: { rowId?: string | null; fieldPath?: string | null }) => void;
  setValidatorPreview: (params: {
    rowId: string;
    fieldPath: string;
    value: ValidatorDraftValue | null;
  }) => void;
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
