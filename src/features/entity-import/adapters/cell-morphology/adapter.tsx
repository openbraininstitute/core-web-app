'use client';

import { RiEditBoxLine } from '@remixicon/react';
import { type ReactNode, useState } from 'react';
import { z } from 'zod';

import { CellMorphologyGenerationType } from '@/api/entitycore/types/entities/cell-morphology-protocol';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  RepairPipelineState,
  RepairPipelineTypeSchema,
  type TRepairPipelineState,
} from '@/api/entitycore/types/shared/protocol';
import {
  type ContributionDraft,
  ContributionsEditor,
  countRenderableEntries,
  getRenderableContributionEntries,
  promoteContributionToPrimary,
  summarizeContributions,
} from '@/features/entity-import/adapters/cell-morphology/contributions-editor';
import {
  parseContributionCsvValue,
  parseLocationCsvValue,
} from '@/features/entity-import/adapters/cell-morphology/csv-tuple-parser';
import {
  LocationEditor,
  type LocationValue,
  normalizeLocationValue,
  parseLocationSummary,
  summarizeLocation,
} from '@/features/entity-import/adapters/cell-morphology/location-editor';
import {
  type CellMorphologyContributionInput,
  type CellMorphologyRegistrationMetadata,
  createCellMorphologyImportServices,
  type ICellMorphologyImportServices,
} from '@/features/entity-import/adapters/cell-morphology/services';
import {
  type IImportRowState,
  ImportInputType,
  type ISuggestion,
  RemoteValidationStatus,
} from '@/features/entity-import/core/contracts';
import { findExactSuggestionMatch } from '@/features/entity-import/core/helpers';
import {
  ENTITY_IMPORT_TOOLTIP_BADGE_TRIGGER_CLASSNAME,
  ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME,
} from '@/features/entity-import/ui/tooltip-styles';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { AgentType } from '@/ui/segments/contribute/shared/types';
import { cn } from '@/utils/css-class';

import type {
  EntityImportRuntimeContext,
  IEntityImportAdapter,
  RemoteSearchPagedArgs,
  RemoteValidationResult,
  ValidatorSuggestionDetailsArgs,
} from '@/features/entity-import/core/adapter';

const DEFAULT_LICENSE_ID = 'ad8686db-3cdd-4e3f-bcbd-812380a9eba7';
const REPAIR_PIPELINE_STATE_OPTIONS = Object.values(RepairPipelineState).map((option) => ({
  value: option.key,
  label: option.label,
}));

const contributionAgentKeys = [
  AgentType.Person.key,
  AgentType.Organization.key,
  AgentType.Consortium.key,
] as const;

function readSuggestionString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function renderSuggestionDetailRows(rows: Array<{ label: string; value: ReactNode }>) {
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

function renderBrainRegionSuggestionDetails({ suggestion }: ValidatorSuggestionDetailsArgs) {
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

function renderProtocolSuggestionDetails({ suggestion }: ValidatorSuggestionDetailsArgs) {
  return renderSuggestionDetailRows([
    {
      label: 'Generation Type',
      value: readSuggestionString(
        (suggestion.metadata as { generationType?: unknown } | undefined)?.generationType
      ),
    },
    {
      label: 'Description',
      value: readSuggestionString(
        (suggestion.metadata as { description?: unknown } | undefined)?.description
      ),
    },
    {
      label: 'Protocol Document',
      value: (suggestion.metadata?.protocol_document as string | undefined) ? (
        <span className="inline-block max-w-full truncate align-middle">
          <a
            href={
              (suggestion.metadata as { protocol_document?: string } | undefined)?.protocol_document
            }
            className="text-primary-9 hover:text-primary-7 word-break-break-all maw-w-full"
            target="_blank"
            rel="noopener noreferrer"
          >
            {(suggestion.metadata as { protocol_document?: string } | undefined)?.protocol_document}
          </a>
        </span>
      ) : null,
    },
  ]);
}

function renderSubjectSuggestionDetails({ suggestion }: ValidatorSuggestionDetailsArgs) {
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

function renderMtypeSuggestionDetails({ suggestion }: ValidatorSuggestionDetailsArgs) {
  return renderSuggestionDetailRows([
    {
      label: 'Alternative Label',
      value: readSuggestionString(suggestion.description),
    },
  ]);
}

const contributionEntrySchema = z.object({
  agent_type: z.enum(contributionAgentKeys),
  agent_id: z
    .uuid({ error: 'Contributor is required' })
    .nonempty({ message: 'Contributor is required' }),
  role_id: z.string({ error: 'Role is required' }).min(1, 'Role is required'),
});

const locationSchema = z
  .object({
    x: z.number().nullable().optional(),
    y: z.number().nullable().optional(),
    z: z.number().nullable().optional(),
  })
  .nullable()
  .superRefine((value, ctx) => {
    if (!value) {
      return;
    }

    const definedCount = [value.x, value.y, value.z].filter(
      (entry) => entry !== null && entry !== undefined
    ).length;

    if (definedCount > 0 && definedCount < 3) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide all X, Y, and Z coordinates together.',
      });
    }
  });

const metadataSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  brain_region_id: z
    .uuid({ error: 'Brain region is required' })
    .nonempty({ message: 'Brain region is required' }),
  cell_morphology_protocol_id: z
    .uuid({ error: 'Protocol is required' })
    .nonempty({ message: 'Protocol is required' }),
  subject_id: z.uuid({ error: 'Subject is required' }).nonempty({ message: 'Subject is required' }),
  license_id: z.uuid({ error: 'License is required' }).nonempty({ message: 'License is required' }),
  experiment_date: z.string().nullable(),
  contact_email: z.union([z.email('Contact email must be valid'), z.null()]),
  published_in: z.string().nullable(),
  location: locationSchema,
  repair_pipeline_state: RepairPipelineTypeSchema.nullable(),
});

export const cellMorphologySubmissionSchema = z.object({
  sourceFile: z.instanceof(File, { message: 'Morphology file is required' }),
  metadata: metadataSchema,
  contribution: z.array(contributionEntrySchema).min(1, 'At least one contribution is required'),
  mtype_class_id: z
    .uuid({ error: 'M-type is required' })
    .nonempty({ message: 'M-type is required' }),
});

export interface CellMorphologySubmissionPayload {
  sourceFile: File;
  metadata: CellMorphologyRegistrationMetadata;
  contribution: Array<CellMorphologyContributionInput>;
  mtype_class_id: string;
}

interface CreateCellMorphologyImportAdapterOptions {
  defaultBrainRegionId: string;
  defaultLicenseId?: string;
  services?: ICellMorphologyImportServices;
}

function normalizeOptionalString(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function summarizeCount(label: string, count: number): string {
  return count > 0 ? `${count} ${label}${count === 1 ? '' : 's'}` : '';
}

function sanitizeContributions(entries: unknown): Array<ContributionDraft> {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.filter((entry) => {
    return entry.agent_type || entry.agent_id || entry.role_id;
  });
}

function readLocation(parsedValue: unknown, rawValue: string): LocationValue | null {
  return normalizeLocationValue(parsedValue) ?? parseLocationSummary(rawValue) ?? null;
}

function getContributionIssues(entries: unknown): Array<string> {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || !('issues' in entry)) {
      return [];
    }

    return Array.isArray(entry.issues)
      ? entry.issues.filter((issue: unknown): issue is string => typeof issue === 'string')
      : [];
  });
}

function getProtocolGenerationType(row: IImportRowState): string | null {
  const protocolCell = row.cells.protocolId;

  if (protocolCell.remoteState.status !== RemoteValidationStatus.Valid) {
    return null;
  }

  const metadata = protocolCell.remoteState.selectedSuggestion?.metadata as
    | { generationType?: string }
    | undefined;

  return metadata?.generationType ?? null;
}

function hasDigitalReconstructionProtocol(row: IImportRowState): boolean {
  return getProtocolGenerationType(row) === CellMorphologyGenerationType.DigitalReconstruction.key;
}

function createRemoteQuery<TQueryField extends string>({
  queryField,
  querySuggestions,
}: {
  queryField: TQueryField;
  querySuggestions: (args: {
    query: string;
    queryField: TQueryField;
    context: EntityImportRuntimeContext;
    pageParam?: number;
    pageSize?: number;
  }) => Promise<{ suggestions: Array<ISuggestion>; nextPageParam: number | null }>;
}) {
  return async ({ query, context, pageParam, pageSize }: RemoteSearchPagedArgs) =>
    querySuggestions({
      query,
      queryField,
      context,
      pageParam,
      pageSize,
    });
}

function createSingleSuggestionRemoteEvaluator<TQueryField extends string>({
  label,
  queryField,
  querySuggestions,
}: {
  label: string;
  queryField: TQueryField;
  querySuggestions: (args: {
    query: string;
    queryField: TQueryField;
    context: EntityImportRuntimeContext;
    pageParam?: number;
    pageSize?: number;
  }) => Promise<{ suggestions: Array<ISuggestion>; nextPageParam: number | null }>;
}) {
  return async ({
    query,
    context,
  }: {
    query: string;
    context: EntityImportRuntimeContext;
  }): Promise<RemoteValidationResult> => {
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

function createExactOnlyRemoteEvaluator<TQueryField extends string>({
  label,
  queryField,
  querySuggestions,
}: {
  label: string;
  queryField: TQueryField;
  querySuggestions: (args: {
    query: string;
    queryField: TQueryField;
    context: EntityImportRuntimeContext;
    pageParam?: number;
    pageSize?: number;
  }) => Promise<{ suggestions: Array<ISuggestion>; nextPageParam: number | null }>;
}) {
  return async ({
    query,
    context,
  }: {
    query: string;
    context: EntityImportRuntimeContext;
  }): Promise<RemoteValidationResult> => {
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

function resolveContributionPreview(entry: ContributionDraft): {
  label: string;
  roleLabel: string | null;
} {
  return {
    label:
      entry.agent_label?.trim() ||
      entry.imported_agent_text?.trim() ||
      entry.agent_id?.trim() ||
      entry.role_label?.trim() ||
      entry.imported_role_text?.trim() ||
      entry.role_id?.trim() ||
      'Unnamed contributor',
    roleLabel:
      entry.role_label?.trim() || entry.imported_role_text?.trim() || entry.role_id?.trim() || null,
  };
}

function ContributionPreviewText({
  entry,
  emptyLabel,
}: {
  entry: ContributionDraft | null;
  emptyLabel: string;
}) {
  if (!entry) {
    return (
      <span className="flex items-center gap-1 font-bold text-primary-9 hover:text-primary-7">
        {emptyLabel}
        <RiEditBoxLine />
      </span>
    );
  }

  const preview = resolveContributionPreview(entry);

  return (
    <span className="min-w-0 flex-1 text-left">
      <span className="block truncate text-sm font-medium text-neutral-900" title={preview.label}>
        {preview.label}
      </span>
      {preview.roleLabel ? (
        <span className="block truncate text-xs text-neutral-500" title={preview.roleLabel}>
          {preview.roleLabel}
        </span>
      ) : null}
    </span>
  );
}

function ContributionSummaryCell({
  label,
  triggerLabel,
  entries,
  onClick,
  onPromoteContribution,
}: {
  label: string;
  triggerLabel: string;
  entries: unknown;
  onClick: () => void;
  onPromoteContribution: (contributionId: string) => void;
}) {
  const contributions = getRenderableContributionEntries(entries);
  const primary = contributions[0] ?? null;
  const overflowCount = Math.max(contributions.length - 1, 0);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <div className="flex h-full min-h-[52px] w-full items-stretch gap-2 px-3 py-2">
      <Button
        type="button"
        aria-label={triggerLabel}
        variant="ghost"
        size="md"
        className="h-full min-h-[52px] min-w-0 flex-1 justify-start rounded-none border-0 bg-transparent px-0 py-0 text-left shadow-none hover:bg-neutral-50"
        onClick={onClick}
      >
        <ContributionPreviewText entry={primary} emptyLabel={`Add ${label.toLowerCase()}`} />
      </Button>

      {overflowCount > 0 ? (
        <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`Show ${overflowCount} more contribution${overflowCount === 1 ? '' : 's'}`}
              className={cn(ENTITY_IMPORT_TOOLTIP_BADGE_TRIGGER_CLASSNAME, 'size-8!')}
              onClick={(event) => event.stopPropagation()}
            >
              +{overflowCount}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="end"
            sideOffset={0}
            arrowClassName="bg-white"
            className={ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME}
          >
            <div data-testid="contribution-tooltip-list" className="max-h-64 overflow-y-auto pr-1">
              {contributions.map((entry, index) => {
                const preview = resolveContributionPreview(entry);

                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-label={`Make ${preview.label} primary contribution`}
                    className={cn(
                      'flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2 text-left transition',
                      index === 0
                        ? 'border-primary-6 bg-primary-0/10'
                        : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50',
                      index > 0 && 'mt-2'
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      onPromoteContribution(entry.id);
                      setTooltipOpen(false);
                    }}
                  >
                    <ContributionPreviewText entry={entry} emptyLabel="" />
                  </button>
                );
              })}
            </div>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

export function createCellMorphologyImportAdapter({
  defaultBrainRegionId: _defaultBrainRegionId,
  defaultLicenseId: _defaultLicenseId = DEFAULT_LICENSE_ID,
  services = createCellMorphologyImportServices(),
}: CreateCellMorphologyImportAdapterOptions): IEntityImportAdapter<
  CellMorphologySubmissionPayload,
  { id: string; isValid: boolean }
> {
  return {
    id: 'cell-morphology-import',
    title: 'Cell Morphology Import',
    submitLabel: 'Import',
    templateFileName: 'cell-morphology-import-template.csv',
    templateGuide: {
      entityType: ExtendedEntitiesTypeDict.CellMorphology,
      guideFileName: 'cell-morphology-import-template.md',
    },
    fields: [
      {
        label: 'Name',
        path: 'name',
        submissionPath: 'setup.name',
        validationPath: 'metadata.name',
        required: true,
        placeholder: 'Enter name',
        inputType: ImportInputType.Text,
        columnWidth: 180,
      },
      {
        label: 'Description',
        path: 'description',
        submissionPath: 'setup.description',
        validationPath: 'metadata.description',
        required: true,
        placeholder: 'Enter description',
        inputType: ImportInputType.Textarea,
        columnWidth: 260,
      },
      {
        label: 'Brain Region',
        path: 'brainRegionId',
        submissionPath: 'setup.brain_region_id',
        validationPath: 'metadata.brain_region_id',
        required: true,
        inputType: ImportInputType.RemoteSelect,
        placeholder: 'Search brain region',
        remote: {
          query: createRemoteQuery({
            queryField: 'semantic_search',
            querySuggestions: services.queryBrainRegion,
          }),
          evaluate: async ({ query, context }) =>
            createSingleSuggestionRemoteEvaluator({
              label: 'Brain Region',
              queryField: 'name__ilike',
              querySuggestions: services.queryBrainRegion,
            })({ query, context }),
        },
        validatorSuggestionDetails: renderBrainRegionSuggestionDetails,
        columnWidth: 200,
      },
      {
        label: 'Experiment Date',
        path: 'experimentDate',
        submissionPath: 'setup.experiment_date',
        validationPath: 'metadata.experiment_date',
        required: false,
        inputType: ImportInputType.Date,
        columnWidth: 140,
      },
      {
        label: 'Contact Email',
        path: 'contactEmail',
        submissionPath: 'setup.contact_email',
        validationPath: 'metadata.contact_email',
        required: false,
        inputType: ImportInputType.Text,
        columnWidth: 200,
      },
      {
        label: 'Published In',
        path: 'publishedIn',
        submissionPath: 'setup.published_in',
        validationPath: 'metadata.published_in',
        required: false,
        inputType: ImportInputType.Text,
        columnWidth: 180,
      },
      {
        label: 'Location',
        path: 'location',
        submissionPath: 'setup.location',
        validationPath: 'metadata.location',
        required: false,
        inputType: ImportInputType.Compound,
        csv: {
          hydrateCell: ({ rawValue }) => {
            const parsedLocation = parseLocationCsvValue(rawValue);

            return {
              rawValue: parsedLocation.rawValue,
              parsedValue: parsedLocation.parsedValue,
            };
          },
        },
        getValidationIssues: ({ cell }) => parseLocationCsvValue(cell.rawValue).issues,
        validatorManualApplyMode: 'stage',
        tableRenderer: ({ cell, row, field, actions }) => (
          <LocationEditor
            cell={cell}
            row={row}
            fieldPath={field.path}
            actions={actions}
            mode="table"
          />
        ),
        panelRenderer: ({ cell, row, field, actions, draftValue, onDraftChange }) => (
          <LocationEditor
            cell={cell}
            row={row}
            fieldPath={field.path}
            actions={actions}
            mode="panel"
            value={
              normalizeLocationValue(draftValue.parsedValue) ??
              parseLocationSummary(draftValue.rawValue)
            }
            onChange={(nextLocation) =>
              onDraftChange({
                rawValue: summarizeLocation(nextLocation),
                displayValue: null,
                parsedValue: nextLocation,
              })
            }
          />
        ),
        columnWidth: 240,
      },
      {
        label: 'Subject',
        path: 'subjectId',
        submissionPath: 'subject_id',
        validationPath: 'metadata.subject_id',
        required: true,
        inputType: ImportInputType.RemoteSelect,
        placeholder: 'Search subject',
        remote: {
          query: createRemoteQuery({
            queryField: 'ilike_search',
            querySuggestions: services.querySubject,
          }),
          evaluate: async ({ query, context }) =>
            createSingleSuggestionRemoteEvaluator({
              label: 'Subject',
              queryField: 'ilike_search',
              querySuggestions: services.querySubject,
            })({ query, context }),
        },
        validatorSuggestionDetails: renderSubjectSuggestionDetails,
        columnWidth: 200,
      },
      {
        label: 'License',
        path: 'licenseId',
        submissionPath: 'license_id',
        validationPath: 'metadata.license_id',
        required: true,
        inputType: ImportInputType.RemoteSelect,
        placeholder: 'Search license',
        remote: {
          query: createRemoteQuery({
            queryField: 'ilike_search',
            querySuggestions: services.queryLicense,
          }),
          evaluate: async ({ query, context }) =>
            createSingleSuggestionRemoteEvaluator({
              label: 'License',
              queryField: 'label__ilike',
              querySuggestions: services.queryLicense,
            })({ query, context }),
        },
        columnWidth: 200,
      },
      {
        label: 'Protocol',
        path: 'protocolId',
        submissionPath: 'cell_morphology_protocol_id',
        validationPath: 'metadata.cell_morphology_protocol_id',
        required: true,
        inputType: ImportInputType.RemoteSelect,
        placeholder: 'Search protocol',
        remote: {
          query: createRemoteQuery({
            queryField: 'ilike_search',
            querySuggestions: services.queryProtocol,
          }),
          evaluate: async ({ query, context }) =>
            createExactOnlyRemoteEvaluator({
              label: 'Protocol',
              queryField: 'ilike_search',
              querySuggestions: services.queryProtocol,
            })({ query, context }),
        },
        validatorSuggestionDetails: renderProtocolSuggestionDetails,
        columnWidth: 220,
      },
      {
        label: 'Repair Pipeline State',
        path: 'repairPipelineState',
        submissionPath: 'repair_pipeline_state',
        validationPath: 'metadata.repair_pipeline_state',
        required: false,
        inputType: ImportInputType.Select,
        placeholder: 'Select repair pipeline state',
        dependencies: ['protocolId'],
        options: REPAIR_PIPELINE_STATE_OPTIONS,
        isEnabled: ({ row }) => hasDigitalReconstructionProtocol(row),
        getDisabledMessage: () =>
          'Select a digital reconstruction protocol to enable Repair Pipeline State.',
        columnWidth: 190,
      },
      {
        label: 'M-Type',
        path: 'mtypeClassId',
        submissionPath: 'mtype_class_id',
        validationPath: 'mtype_class_id',
        required: true,
        inputType: ImportInputType.RemoteSelect,
        placeholder: 'Search m-type',
        remote: {
          query: createRemoteQuery({
            queryField: 'ilike_search',
            querySuggestions: services.queryMtype,
          }),
          evaluate: async ({ query, context }) =>
            createSingleSuggestionRemoteEvaluator({
              label: 'M-Type',
              queryField: 'pref_label__ilike',
              querySuggestions: services.queryMtype,
            })({ query, context }),
        },
        validatorSuggestionDetails: renderMtypeSuggestionDetails,
        columnWidth: 180,
      },
      {
        label: 'Contributions',
        path: 'contributions',
        submissionPath: 'contribution',
        validationPath: 'contribution',
        required: true,
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
        columnWidth: 220,
      },
      {
        label: 'Morphology File',
        path: 'sourceFile',
        submissionPath: 'assets.sourceFile',
        validationPath: 'sourceFile',
        required: true,
        inputType: ImportInputType.FileBundle,
        csv: { include: false },
        fileConfig: {
          accept: ['application/swc', 'application/asc', 'application/x-hdf5'],
          allowedExtensions: ['.swc', '.asc', '.h5', '.H5', '.SWC', '.ASC'],
          maxFiles: 1,
        },
        columnWidth: 200,
      },
    ],
    schema: cellMorphologySubmissionSchema as z.ZodType<CellMorphologySubmissionPayload>,
    createBlankRow: () => ({
      sourceFile: '',
      name: '',
      description: '',
      brainRegionId: _defaultBrainRegionId,
      experimentDate: '',
      contactEmail: '',
      publishedIn: '',
      location: '',
      subjectId: '',
      licenseId: _defaultLicenseId,
      protocolId: '',
      repairPipelineState: '',
      mtypeClassId: '',
      contributions: '',
    }),
    buildPayload: ({ row, values }) => {
      const sourceFileValue = row.cells.sourceFile.parsedValue;
      const sourceFile = Array.isArray(sourceFileValue)
        ? ((sourceFileValue[0] as File | undefined) ?? null)
        : (sourceFileValue as File | null);
      const contributions = sanitizeContributions(row.cells.contributions.parsedValue);
      const location = readLocation(row.cells.location.parsedValue, row.cells.location.rawValue);
      const repairPipelineState = hasDigitalReconstructionProtocol(row)
        ? (normalizeOptionalString(values.repairPipelineState) as TRepairPipelineState | null)
        : null;

      return {
        sourceFile: sourceFile as File,
        metadata: {
          name: values.name,
          description: values.description,
          brain_region_id: values.brainRegionId,
          cell_morphology_protocol_id: values.protocolId,
          subject_id: values.subjectId,
          license_id: values.licenseId,
          experiment_date: normalizeOptionalString(values.experimentDate),
          contact_email: normalizeOptionalString(values.contactEmail),
          published_in: normalizeOptionalString(values.publishedIn),
          location,
          repair_pipeline_state: repairPipelineState,
        },
        contribution: contributions as Array<CellMorphologyContributionInput>,
        mtype_class_id: values.mtypeClassId,
      } as CellMorphologySubmissionPayload;
    },
    submitRow: async ({ payload, context }) => {
      const registration = await services.registerMorphology({
        file: payload.sourceFile,
        metadata: payload.metadata,
        context,
      });

      for (const contribution of payload.contribution) {
        await services.createContribution({
          entityId: registration.id,
          contribution: contribution as CellMorphologyContributionInput,
          context,
        });
      }

      await services.createMtypeClassification({
        entityId: registration.id,
        mtypeClassId: payload.mtype_class_id,
        context,
      });

      return registration;
    },
  };
}

export function getContributionSummary(entries: unknown): string {
  return summarizeCount('contributor', sanitizeContributions(entries).length);
}

export function getLocationSummary(location: LocationValue | null): string {
  if (!location) {
    return '';
  }

  return [location.x, location.y, location.z]
    .map((value) => (value === null || value === undefined ? '' : value))
    .join(', ');
}

export function isCellMorphologySuggestionRecommended(
  suggestions: Array<ISuggestion>,
  candidate: ISuggestion
): boolean {
  return suggestions.some(
    (suggestion) => suggestion.value === candidate.value && suggestion.recommended
  );
}
