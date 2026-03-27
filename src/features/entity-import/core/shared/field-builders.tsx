'use client';

import { ValidatorManualApplyMode } from '@/features/entity-import/core/adapter';
import {
  ImportInputType,
  type ISuggestion,
  RemoteValidationStatus,
} from '@/features/entity-import/core/contracts';
import { findExactSuggestionMatch } from '@/features/entity-import/core/helpers';
import { parseContributionCsvValue } from '@/features/entity-import/core/shared/contribution-csv-parser';
import {
  type ContributionDraft,
  ContributionSummaryCell,
  ContributionsEditor,
  countRenderableEntries,
  getContributionIssues,
  promoteContributionToPrimary,
  summarizeContributions,
} from '@/features/entity-import/core/shared/contributions-editor';

import type { ReactNode } from 'react';
import type {
  IAdapterFieldDefinition,
  IEntityImportRuntimeContext,
  IRemoteSearchPagedArgs,
  IRemoteValidationResult,
  IValidatorSuggestionDetailsArgs,
} from '@/features/entity-import/core/adapter';
import type {
  BrainRegionQueryField,
  CommonQueryArgs,
  IEntityImportContributionLookupServices,
  IEntityImportSharedQueryServices,
  SharedTextQueryField,
} from '@/features/entity-import/core/shared/common-query-services';

export const DEFAULT_ENTITY_IMPORT_LICENSE_ID = 'ad8686db-3cdd-4e3f-bcbd-812380a9eba7';

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

export function renderBrainRegionSuggestionDetails({
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

export function renderSubjectSuggestionDetails({ suggestion }: IValidatorSuggestionDetailsArgs) {
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

export function renderMtypeSuggestionDetails({ suggestion }: IValidatorSuggestionDetailsArgs) {
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

export function createRemoteQuery<TQueryField extends string>({
  queryField,
  querySuggestions,
}: {
  queryField: TQueryField;
  querySuggestions: (
    args: CommonQueryArgs<TQueryField>
  ) => Promise<{ suggestions: Array<ISuggestion>; nextPageParam: number | null }>;
}) {
  return async ({ query, context, pageParam, pageSize }: IRemoteSearchPagedArgs) =>
    querySuggestions({
      query,
      queryField,
      context,
      pageParam,
      pageSize,
    });
}

export function createSingleSuggestionRemoteEvaluator<TQueryField extends string>({
  label,
  queryField,
  querySuggestions,
}: {
  label: string;
  queryField: TQueryField;
  querySuggestions: (
    args: CommonQueryArgs<TQueryField>
  ) => Promise<{ suggestions: Array<ISuggestion>; nextPageParam: number | null }>;
}) {
  return async ({
    query,
    context,
  }: {
    query: string;
    context: IEntityImportRuntimeContext;
  }): Promise<IRemoteValidationResult> => {
    const { suggestions } = await querySuggestions({
      query,
      queryField,
      context,
      pageParam: 1,
      pageSize: 5,
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

export function createExactOnlyRemoteEvaluator<TQueryField extends string>({
  label,
  queryField,
  querySuggestions,
}: {
  label: string;
  queryField: TQueryField;
  querySuggestions: (
    args: CommonQueryArgs<TQueryField>
  ) => Promise<{ suggestions: Array<ISuggestion>; nextPageParam: number | null }>;
}) {
  return async ({
    query,
    context,
  }: {
    query: string;
    context: IEntityImportRuntimeContext;
  }): Promise<IRemoteValidationResult> => {
    const { suggestions } = await querySuggestions({
      query,
      queryField,
      context,
      pageParam: 1,
      pageSize: 5,
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

interface CreateSharedRemoteFieldOptions {
  path: string;
  submissionPath: string;
  validationPath: string;
  required?: boolean;
  columnWidth?: number;
  label?: string;
  placeholder?: string;
}

export function createBrainRegionImportField({
  path,
  submissionPath,
  validationPath,
  required = true,
  columnWidth = 200,
  label = 'Brain Region',
  placeholder = 'Search brain region',
  services,
}: CreateSharedRemoteFieldOptions & {
  services: Pick<IEntityImportSharedQueryServices, 'queryBrainRegion'>;
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
      query: createRemoteQuery({
        queryField: 'semantic_search' satisfies BrainRegionQueryField,
        querySuggestions: services.queryBrainRegion,
      }),
      evaluate: async ({ query, context }) =>
        createSingleSuggestionRemoteEvaluator({
          label,
          queryField: 'name__ilike' satisfies BrainRegionQueryField,
          querySuggestions: services.queryBrainRegion,
        })({ query, context }),
    },
    validatorSuggestionDetails: renderBrainRegionSuggestionDetails,
    columnWidth,
  };
}

export function createSubjectImportField({
  path,
  submissionPath,
  validationPath,
  required = true,
  columnWidth = 200,
  label = 'Subject',
  placeholder = 'Search subject',
  services,
}: CreateSharedRemoteFieldOptions & {
  services: Pick<IEntityImportSharedQueryServices, 'querySubject'>;
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
      query: createRemoteQuery({
        queryField: 'ilike_search' satisfies SharedTextQueryField,
        querySuggestions: services.querySubject,
      }),
      evaluate: async ({ query, context }) =>
        createSingleSuggestionRemoteEvaluator({
          label,
          queryField: 'ilike_search' satisfies SharedTextQueryField,
          querySuggestions: services.querySubject,
        })({ query, context }),
    },
    validatorSuggestionDetails: renderSubjectSuggestionDetails,
    columnWidth,
  };
}

export function createLicenseImportField({
  path,
  submissionPath,
  validationPath,
  required = true,
  columnWidth = 200,
  label = 'License',
  placeholder = 'Search license',
  services,
}: CreateSharedRemoteFieldOptions & {
  services: Pick<IEntityImportSharedQueryServices, 'queryLicense'>;
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
      query: createRemoteQuery({
        queryField: 'ilike_search' satisfies SharedTextQueryField,
        querySuggestions: services.queryLicense,
      }),
      evaluate: async ({ query, context }) =>
        createSingleSuggestionRemoteEvaluator({
          label,
          queryField: 'label__ilike' satisfies SharedTextQueryField,
          querySuggestions: services.queryLicense,
        })({ query, context }),
    },
    validatorManualApplyMode: ValidatorManualApplyMode.Commit,
    columnWidth,
  };
}

export function createMtypeImportField({
  path,
  submissionPath,
  validationPath,
  required = true,
  columnWidth = 180,
  label = 'M-Type',
  placeholder = 'Search m-type',
  services,
}: CreateSharedRemoteFieldOptions & {
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
      query: createRemoteQuery({
        queryField: 'ilike_search' satisfies SharedTextQueryField,
        querySuggestions: services.queryMtype,
      }),
      evaluate: async ({ query, context }) =>
        createSingleSuggestionRemoteEvaluator({
          label,
          queryField: 'pref_label__ilike' satisfies SharedTextQueryField,
          querySuggestions: services.queryMtype,
        })({ query, context }),
    },
    validatorSuggestionDetails: renderMtypeSuggestionDetails,
    columnWidth,
  };
}

export function createContributionsImportField({
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
                } satisfies ContributionDraft,
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
                } satisfies ContributionDraft,
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
        onClick={() => actions.selectCell({ rowId: row.id, fieldPath: field.path })}
        onPromoteContribution={(contributionId) => {
          const currentEntries = Array.isArray(cell.parsedValue)
            ? (cell.parsedValue as Array<ContributionDraft>)
            : [];
          const nextEntries = promoteContributionToPrimary(currentEntries, contributionId);
          actions.setCustomValue({
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

export function createFileBundleImportField({
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
