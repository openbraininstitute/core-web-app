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

export interface IAdapterFieldDefinition extends IImportFieldDefinition {
  placeholder?: string;
  helpText?: string;
  validatorManualApplyMode?: TValidatorManualApplyMode;
  csv?: IAdapterFieldCsvConfig;
  options?: Array<ISuggestion>;
  validatorSuggestionDetails?: (args: IValidatorSuggestionDetailsArgs) => ReactNode;
  fileConfig?: IImportFileFieldConfig;
  isEnabled?: (args: IAdapterFieldEnablementArgs) => boolean;
  getDisabledMessage?: (args: IAdapterFieldEnablementArgs) => string;
  getValidationIssues?: (args: IAdapterFieldValidationArgs) => Array<string>;
  remote?: {
    autoResolveResolvedSuggestion?: boolean;
    query?: (args: IRemoteSearchPagedArgs) => Promise<IRemoteSearchPageResult>;
    evaluate?: (args: IRemoteValidationArgs) => Promise<IRemoteValidationResult>;
  };
  tableRenderer?: (props: ITableCellRendererProps) => ReactNode;
  panelRenderer?: (props: IValidatorFieldRendererProps) => ReactNode;
}

export interface ISubmitRowArgs<TPayload> {
  payload: TPayload;
  row: IImportRowState;
  values: TFlatImportValues;
  context: IEntityImportRuntimeContext;
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
    context: IEntityImportRuntimeContext;
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
    value: IValidatorDraftValue | null;
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
  applyManualValueToAll: (params: {
    fieldPath: string;
    targetRowIds: Array<string>;
    rawValue: string;
    displayValue?: string | null;
    parsedValue?: unknown;
  }) => void;
}
