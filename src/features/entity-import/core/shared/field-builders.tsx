'use client';

import { ValidatorWriteStrategy } from '@/features/entity-import/core/adapter';
import {
  ImportInputType,
  type ISuggestion,
  RemoteValidationStatus,
  type TFlatImportValues,
} from '@/features/entity-import/core/contracts';
import { BrainRegionInlineCell } from '@/features/entity-import/core/shared/brain-region-inline-cell';
import { parseContributionCsvValue } from '@/features/entity-import/core/shared/contribution-csv-parser';
import {
  ContributionSummaryCell,
  ContributionsEditor,
  countRenderableEntries,
  getContributionIssues,
  promoteContributionToPrimary,
  summarizeContributions,
  type TContributionDraft,
} from '@/features/entity-import/core/shared/contributions-editor';
import { findExactSuggestionMatch } from '@/features/entity-import/core/shared/helpers';
import {
  createSpeciesMismatchMessage,
  readSpeciesSuggestionFromSuggestion,
  resolveRowSpeciesSuggestion,
} from '@/features/entity-import/core/shared/species-context';
import { SpeciesScopedFieldPanel } from '@/features/entity-import/core/shared/species-scoped-field-panel';
import { DEFAULT_LICENSE_ID, DEFAULT_LICENSE_NAME } from '@/ui/segments/contribute/shared/helpers';

import type { ReactNode } from 'react';
import type {
  IAdapterFieldDefinition,
  IEntityImportRuntimeContext,
  IRemoteSearchPagedArgs,
  IRemoteValidationResult,
  IValidatorSuggestionDetailsArgs,
} from '@/features/entity-import/core/adapter';
import type {
  CommonQueryArgs,
  IEntityImportContributionLookupServices,
  IEntityImportSharedQueryServices,
  TBrainRegionQueryField,
  TSharedTextQueryField,
} from '@/features/entity-import/core/shared/common-query-services';

export function readSuggestionString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function renderSuggestionDetailRows(rows: Array<{ label: string; value: ReactNode }>) {
  const presentRows = rows.filter((row) => row.value);
  if (presentRows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 max-w-full">
      {presentRows.map((row) => (
        <div key={row.label} className="max-w-full">
          <span className="font-semibold text-primary-9 mr-0.5">{row.label}:</span>
          {row.value}
        </div>
      ))}
    </div>
  );
}

export function renderBrainRegionSuggestionTooltip({
  suggestion,
}: IValidatorSuggestionDetailsArgs) {
  return renderSuggestionDetailRows([
    {
      label: 'Species',
      value: readSuggestionString(
        (suggestion.metadata as { species: string; acronym: string })?.species
      ),
    },
    {
      label: 'Acronym',
      value: readSuggestionString(
        (suggestion.metadata as { species: string; acronym: string })?.acronym
      ),
    },
  ]);
}

export function renderSubjectSuggestionTooltip({ suggestion }: IValidatorSuggestionDetailsArgs) {
  return renderSuggestionDetailRows([
    {
      label: 'Species',
      value: readSuggestionString(
        (suggestion.metadata as { species?: string } | undefined)?.species
      ),
    },
    {
      label: 'Strain',
      value: readSuggestionString((suggestion.metadata as { strain?: string } | undefined)?.strain),
    },
    {
      label: 'Sex',
      value: readSuggestionString((suggestion.metadata as { sex?: string } | undefined)?.sex),
    },
    {
      label: 'Age',
      value: readSuggestionString((suggestion.metadata as { age?: number } | undefined)?.age),
    },
  ]);
}

export function renderMtypeSuggestionTooltip({ suggestion }: IValidatorSuggestionDetailsArgs) {
  return renderSuggestionDetailRows([
    {
      label: 'Alternative Label',
      value: readSuggestionString(suggestion.description),
    },
    {
      label: 'Definition',
      value: readSuggestionString(
        (suggestion.metadata as { definition?: string } | undefined)?.definition
      ),
    },
  ]);
}

export function renderEtypeSuggestionTooltip({ suggestion }: IValidatorSuggestionDetailsArgs) {
  return renderSuggestionDetailRows([
    {
      label: 'Alternative Label',
      value: readSuggestionString(suggestion.description),
    },
    {
      label: 'Definition',
      value: readSuggestionString(
        (suggestion.metadata as { definition?: string } | undefined)?.definition
      ),
    },
  ]);
}

export function makeRemoteQuery<TQueryField extends string>({
  queryField,
  querySuggestions,
  resolveFilters,
}: {
  queryField: TQueryField;
  querySuggestions: (
    args: CommonQueryArgs<TQueryField>
  ) => Promise<{ suggestions: Array<ISuggestion>; nextPageParam: number | null }>;
  resolveFilters?: (args: {
    row: IRemoteSearchPagedArgs['row'];
    values: TFlatImportValues;
  }) => CommonQueryArgs<TQueryField>['filters'];
}) {
  return async ({ query, context, pageParam, pageSize, row, values }: IRemoteSearchPagedArgs) =>
    querySuggestions({
      query,
      queryField,
      context,
      pageParam,
      pageSize,
      row,
      values,
      filters: resolveFilters?.({ row, values }),
    });
}

export function makeSingleSuggestionRemoteEvaluator<TQueryField extends string>({
  label,
  queryField,
  querySuggestions,
  resolveFilters,
}: {
  label: string;
  queryField: TQueryField;
  querySuggestions: (
    args: CommonQueryArgs<TQueryField>
  ) => Promise<{ suggestions: Array<ISuggestion>; nextPageParam: number | null }>;
  resolveFilters?: (args: {
    row: IRemoteSearchPagedArgs['row'];
    values: TFlatImportValues;
  }) => CommonQueryArgs<TQueryField>['filters'];
}) {
  return async ({
    query,
    context,
    row,
    values,
  }: {
    query: string;
    context: IEntityImportRuntimeContext;
    row: IRemoteSearchPagedArgs['row'];
    values: TFlatImportValues;
  }): Promise<IRemoteValidationResult> => {
    const { suggestions } = await querySuggestions({
      query,
      queryField,
      context,
      pageParam: 1,
      pageSize: 5,
      row,
      values,
      filters: resolveFilters?.({ row, values }),
    });

    if (suggestions.length === 1) {
      return {
        status: RemoteValidationStatus.Valid,
        resolvedSuggestion: suggestions[0],
      };
    }

    if (suggestions.length > 1) {
      return {
        status: RemoteValidationStatus.Invalid,
        message: `Multiple matches found for ${label}. Choose one in the validator.`,
        suggestions,
      };
    }

    return {
      status: RemoteValidationStatus.Invalid,
      message: `No matches found for ${label}.`,
      suggestions: [],
    };
  };
}

export function makeExactOnlyRemoteEvaluator<TQueryField extends string>({
  label,
  queryField,
  querySuggestions,
  resolveFilters,
}: {
  label: string;
  queryField: TQueryField;
  querySuggestions: (
    args: CommonQueryArgs<TQueryField>
  ) => Promise<{ suggestions: Array<ISuggestion>; nextPageParam: number | null }>;
  resolveFilters?: (args: {
    row: IRemoteSearchPagedArgs['row'];
    values: TFlatImportValues;
  }) => CommonQueryArgs<TQueryField>['filters'];
}) {
  return async ({
    query,
    context,
    row,
    values,
  }: {
    query: string;
    context: IEntityImportRuntimeContext;
    row: IRemoteSearchPagedArgs['row'];
    values: TFlatImportValues;
  }): Promise<IRemoteValidationResult> => {
    const { suggestions } = await querySuggestions({
      query,
      queryField,
      context,
      pageParam: 1,
      pageSize: 5,
      row,
      values,
      filters: resolveFilters?.({ row, values }),
    });

    const exactMatch = findExactSuggestionMatch(suggestions, query);
    if (exactMatch) {
      return {
        status: RemoteValidationStatus.Valid,
        resolvedSuggestion: exactMatch,
      };
    }

    if (suggestions.length > 0) {
      return {
        status: RemoteValidationStatus.Invalid,
        message: `Choose the correct ${label} in the validator.`,
        suggestions,
      };
    }

    return {
      status: RemoteValidationStatus.Invalid,
      message: `No matches found for ${label}.`,
      suggestions: [],
    };
  };
}

interface ISharedRemoteFieldOptions {
  path: string;
  submissionPath: string;
  validationPath: string;
  required?: boolean;
  columnWidth?: number;
  label?: string;
  placeholder?: string;
}

function createSpeciesFilterResolver({
  fieldPath,
  relatedFieldPath,
}: {
  fieldPath: string;
  relatedFieldPath?: string;
}) {
  return ({
    row,
  }: {
    row: IRemoteSearchPagedArgs['row'];
    values: TFlatImportValues;
  }): { speciesId?: string | null } => ({
    speciesId:
      resolveRowSpeciesSuggestion({
        row,
        fieldPath,
        relatedFieldPath,
      })?.value ?? null,
  });
}

function createSpeciesMismatchValidator({
  fieldPath,
  relatedFieldPath,
  fieldLabel,
  relatedFieldLabel,
}: {
  fieldPath: string;
  relatedFieldPath?: string;
  fieldLabel: string;
  relatedFieldLabel: string;
}) {
  return ({ row }: { row: IRemoteSearchPagedArgs['row'] }) => {
    const ownSpecies = readSpeciesSuggestionFromSuggestion(
      row.cells[fieldPath]?.remoteState.selectedSuggestion
    );
    const relatedSpecies = relatedFieldPath
      ? readSpeciesSuggestionFromSuggestion(
          row.cells[relatedFieldPath]?.remoteState.selectedSuggestion
        )
      : null;
    if (!ownSpecies?.value || !relatedSpecies?.value || ownSpecies.value === relatedSpecies.value) {
      return [];
    }

    return [createSpeciesMismatchMessage(fieldLabel, relatedFieldLabel)];
  };
}

export function makeBrainRegionImportField({
  path,
  submissionPath,
  validationPath,
  required = true,
  columnWidth = 200,
  label = 'Brain Region',
  placeholder = 'Search brain region',
  services,
  relatedSubjectPath = 'subjectId',
}: ISharedRemoteFieldOptions & {
  services: Pick<IEntityImportSharedQueryServices, 'queryBrainRegion' | 'querySpecies'>;
  relatedSubjectPath?: string;
}): IAdapterFieldDefinition {
  const resolveFilters = createSpeciesFilterResolver({
    fieldPath: path,
    relatedFieldPath: relatedSubjectPath,
  });

  return {
    label,
    path,
    submissionPath,
    validationPath,
    required,
    inputType: ImportInputType.RemoteSelect,
    placeholder,
    remote: {
      query: makeRemoteQuery({
        queryField: 'semantic_search' satisfies TBrainRegionQueryField,
        querySuggestions: services.queryBrainRegion,
        resolveFilters,
      }),
      evaluate: async ({ query, context, row, values }) =>
        makeSingleSuggestionRemoteEvaluator({
          label,
          queryField: 'name__ilike' satisfies TBrainRegionQueryField,
          querySuggestions: services.queryBrainRegion,
          resolveFilters,
        })({ query, context, row, values }),
    },
    validatorSuggestionDetails: renderBrainRegionSuggestionTooltip,
    getValidationIssues: createSpeciesMismatchValidator({
      fieldPath: path,
      relatedFieldPath: relatedSubjectPath,
      fieldLabel: label,
      relatedFieldLabel: 'Subject',
    }),
    tableRenderer: ({ field, cell, row, actions, selected }) => (
      <BrainRegionInlineCell
        field={field}
        cell={cell}
        row={row}
        actions={actions}
        selected={selected}
      />
    ),
    panelRenderer: ({ field, row, cell, actions, context, draftValue, onDraftChange }) => (
      <SpeciesScopedFieldPanel
        field={field}
        row={row}
        cell={cell}
        actions={actions}
        context={context}
        draftValue={draftValue}
        onDraftChange={onDraftChange}
        querySpecies={services.querySpecies}
        relatedFieldPath={relatedSubjectPath}
      />
    ),
    columnWidth,
  };
}

export function makeSubjectImportField({
  path,
  submissionPath,
  validationPath,
  required = true,
  columnWidth = 200,
  label = 'Subject',
  placeholder = 'Search subject',
  services,
  relatedBrainRegionPath = 'brainRegionId',
}: ISharedRemoteFieldOptions & {
  services: Pick<IEntityImportSharedQueryServices, 'querySubject' | 'querySpecies'>;
  relatedBrainRegionPath?: string;
}): IAdapterFieldDefinition {
  const resolveFilters = createSpeciesFilterResolver({
    fieldPath: path,
    relatedFieldPath: relatedBrainRegionPath,
  });

  return {
    label,
    path,
    submissionPath,
    validationPath,
    required,
    inputType: ImportInputType.RemoteSelect,
    placeholder,
    remote: {
      query: makeRemoteQuery({
        queryField: 'ilike_search' satisfies TSharedTextQueryField,
        querySuggestions: services.querySubject,
        resolveFilters,
      }),
      evaluate: async ({ query, context, row, values }) =>
        makeSingleSuggestionRemoteEvaluator({
          label,
          queryField: 'ilike_search' satisfies TSharedTextQueryField,
          querySuggestions: services.querySubject,
          resolveFilters,
        })({ query, context, row, values }),
    },
    validatorSuggestionDetails: renderSubjectSuggestionTooltip,
    getValidationIssues: createSpeciesMismatchValidator({
      fieldPath: path,
      relatedFieldPath: relatedBrainRegionPath,
      fieldLabel: label,
      relatedFieldLabel: 'Brain Region',
    }),
    panelRenderer: ({ field, row, cell, actions, context, draftValue, onDraftChange }) => (
      <SpeciesScopedFieldPanel
        field={field}
        row={row}
        cell={cell}
        actions={actions}
        context={context}
        draftValue={draftValue}
        onDraftChange={onDraftChange}
        querySpecies={services.querySpecies}
        relatedFieldPath={relatedBrainRegionPath}
      />
    ),
    columnWidth,
  };
}

export function makeLicenseImportField({
  path,
  submissionPath,
  validationPath,
  required = true,
  columnWidth = 200,
  label = 'License',
  placeholder = 'Search license',
  services,
  /** when true (default), prefills manual table rows with the app default license (not CSV rows). */
  applyManualTableDefaultLicense = true,
}: ISharedRemoteFieldOptions & {
  services: Pick<IEntityImportSharedQueryServices, 'queryLicense'>;
  applyManualTableDefaultLicense?: boolean;
}): IAdapterFieldDefinition {
  return {
    label,
    path,
    submissionPath,
    validationPath,
    required,
    inputType: ImportInputType.RemoteSelect,
    placeholder,
    ...(applyManualTableDefaultLicense
      ? {
          manualDefault: {
            rawValue: DEFAULT_LICENSE_ID,
            displayValue: DEFAULT_LICENSE_NAME,
          },
        }
      : {}),
    remote: {
      query: makeRemoteQuery({
        queryField: 'ilike_search' satisfies TSharedTextQueryField,
        querySuggestions: services.queryLicense,
      }),
      evaluate: async ({ query, context, row, values }) =>
        makeSingleSuggestionRemoteEvaluator({
          label,
          queryField: 'label__ilike' satisfies TSharedTextQueryField,
          querySuggestions: services.queryLicense,
        })({ query, context, row, values }),
    },
    writeStrategy: ValidatorWriteStrategy.Commit,
    columnWidth,
  };
}

export function makeMtypeImportField({
  path,
  submissionPath,
  validationPath,
  required = true,
  columnWidth = 180,
  label = 'M-Type',
  placeholder = 'Search m-type',
  services,
}: ISharedRemoteFieldOptions & {
  services: Pick<IEntityImportSharedQueryServices, 'queryMtype'>;
}): IAdapterFieldDefinition {
  return {
    label,
    path,
    submissionPath,
    validationPath,
    required,
    inputType: ImportInputType.RemoteSelect,
    placeholder,
    remote: {
      autoResolveResolvedSuggestion: false,
      query: makeRemoteQuery({
        queryField: 'ilike_search',
        querySuggestions: services.queryMtype,
      }),
      evaluate: async ({ query, context, row, values }) =>
        makeSingleSuggestionRemoteEvaluator({
          label,
          queryField: 'pref_label__ilike',
          querySuggestions: services.queryMtype,
        })({ query, context, row, values }),
    },
    validatorSuggestionDetails: renderMtypeSuggestionTooltip,
    columnWidth,
  };
}

export function makeContributionsImportField({
  services,
  label = 'Contributions',
  path = 'contributions',
  submissionPath = 'contribution',
  validationPath = 'contribution',
  required = true,
  columnWidth = 220,
}: {
  services: IEntityImportContributionLookupServices;
  label?: string;
  path?: string;
  submissionPath?: string;
  validationPath?: string;
  required?: boolean;
  columnWidth?: number;
}): IAdapterFieldDefinition {
  return {
    label,
    path,
    submissionPath,
    validationPath,
    required,
    inputType: ImportInputType.Compound,
    csv: {
      hydrateCell: async ({ rawValue, context }) => {
        const parsedContributions = await parseContributionCsvValue({
          rawValue,
          context,
          services,
          resolveExactMatches: false,
        });
        const nextEntries =
          parsedContributions.issues.length > 0 && rawValue.trim()
            ? [
                {
                  id: 'csv-contribution-import-error',
                  source_tuple: rawValue.trim(),
                  agent_id: '',
                  role_id: '',
                  agent_label: '',
                  role_label: '',
                  imported_agent_text: rawValue.trim(),
                  issues: parsedContributions.issues,
                } satisfies TContributionDraft,
              ]
            : parsedContributions.entries;

        return {
          rawValue: summarizeContributions(countRenderableEntries(nextEntries)),
          parsedValue: nextEntries,
        };
      },
      backgroundHydrateCell: async ({ rawValue, context, importCache }) => {
        const parsedContributions = await parseContributionCsvValue({
          rawValue,
          context,
          services,
          lookupCache: importCache,
        });
        const nextEntries =
          parsedContributions.issues.length > 0 && rawValue.trim()
            ? [
                {
                  id: 'csv-contribution-import-error',
                  source_tuple: rawValue.trim(),
                  agent_id: '',
                  role_id: '',
                  agent_label: '',
                  role_label: '',
                  imported_agent_text: rawValue.trim(),
                  issues: parsedContributions.issues,
                } satisfies TContributionDraft,
              ]
            : parsedContributions.entries;

        return {
          rawValue: summarizeContributions(countRenderableEntries(nextEntries)),
          parsedValue: nextEntries,
        };
      },
    },
    getValidationIssues: ({ cell }) => getContributionIssues(cell.parsedValue),
    tableRenderer: ({ field, cell, row, actions }) => (
      <ContributionSummaryCell
        label={field.label}
        triggerLabel={`${field.label} row ${row.rowIndex + 1}`}
        entries={cell.parsedValue}
        onClick={() => actions.onSelectCell({ rowId: row.id, fieldPath: field.path })}
        onPromoteContribution={(contributionId) => {
          const currentEntries = Array.isArray(cell.parsedValue)
            ? (cell.parsedValue as Array<TContributionDraft>)
            : [];
          const nextEntries = promoteContributionToPrimary(currentEntries, contributionId);
          actions.onSetCustomValue({
            rowId: row.id,
            fieldPath: field.path,
            rawValue: summarizeContributions(countRenderableEntries(nextEntries)),
            parsedValue: nextEntries,
          });
        }}
      />
    ),
    panelRenderer: ({ cell, row, field, actions, context }) => (
      <ContributionsEditor
        cell={cell}
        row={row}
        fieldPath={field.path}
        context={context}
        actions={actions}
        services={services}
      />
    ),
    columnWidth,
  };
}

export function makeFileBundleImportField({
  label,
  path,
  submissionPath,
  validationPath,
  required = true,
  columnWidth = 200,
  fileConfig,
}: {
  label: string;
  path: string;
  submissionPath: string;
  validationPath: string;
  required?: boolean;
  columnWidth?: number;
  fileConfig: NonNullable<IAdapterFieldDefinition['fileConfig']>;
}): IAdapterFieldDefinition {
  return {
    label,
    path,
    submissionPath,
    validationPath,
    required,
    inputType: ImportInputType.FileBundle,
    csv: { include: false },
    fileConfig,
    columnWidth,
  };
}

export function makeNameImportField({
  path = 'name',
  submissionPath = 'name',
  validationPath = 'name',
  required = true,
  columnWidth = 180,
  label = 'Name',
  placeholder = 'Enter name',
}: Partial<ISharedRemoteFieldOptions> = {}): IAdapterFieldDefinition {
  return {
    label,
    path,
    submissionPath,
    validationPath,
    required,
    inputType: ImportInputType.Text,
    placeholder,
    columnWidth,
  };
}

export function makeDescriptionImportField({
  path = 'description',
  submissionPath = 'description',
  validationPath = 'description',
  required = true,
  columnWidth = 260,
  label = 'Description',
  placeholder = 'Enter description',
}: Partial<ISharedRemoteFieldOptions> = {}): IAdapterFieldDefinition {
  return {
    label,
    path,
    submissionPath,
    validationPath,
    required,
    inputType: ImportInputType.Textarea,
    placeholder,
    columnWidth,
  };
}

export function makeExperimentDateImportField({
  path = 'experimentDate',
  submissionPath = 'setup.experiment_date',
  validationPath = 'metadata.experiment_date',
  required = false,
  columnWidth = 140,
  label = 'Experiment Date',
  placeholder = 'Enter experiment date',
}: Partial<ISharedRemoteFieldOptions> = {}): IAdapterFieldDefinition {
  return {
    label,
    path,
    submissionPath,
    validationPath,
    required,
    inputType: ImportInputType.Date,
    columnWidth,
    ...(placeholder !== undefined ? { placeholder } : {}),
  };
}

export function makeContactEmailImportField({
  path = 'contactEmail',
  submissionPath = 'setup.contact_email',
  validationPath = 'metadata.contact_email',
  required = false,
  columnWidth = 200,
  label = 'Contact Email',
  placeholder = 'Enter contact email',
}: Partial<ISharedRemoteFieldOptions> = {}): IAdapterFieldDefinition {
  return {
    label,
    path,
    submissionPath,
    validationPath,
    required,
    inputType: ImportInputType.Text,
    columnWidth,
    ...(placeholder !== undefined ? { placeholder } : {}),
  };
}

/** trim a string and return null if empty. Used for optional text fields. */
export function normalizeOptionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

/** tilter contribution entries to only those with both agent_id and role_id. */
export function sanitizeContributions<T extends { agent_id?: string; role_id?: string }>(
  entries: unknown
): Array<T> {
  if (!Array.isArray(entries)) return [];
  return entries.filter((e) => e.agent_id && e.role_id) as Array<T>;
}
