'use client';

import { RiEditBoxLine } from '@remixicon/react';
import { useState } from 'react';
import { z } from 'zod';

import { CellMorphologyGenerationType } from '@/api/entitycore/types/entities/cell-morphology-protocol';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  RepairPipelineState,
  RepairPipelineTypeSchema,
  type TRepairPipelineState,
} from '@/api/entitycore/types/shared/protocol';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { AgentType } from '@/ui/segments/contribute/shared/types';
import { cn } from '@/utils/css-class';

import { ImportInputType, type ImportRowState, type ISuggestion } from '../../core/contracts';
import { ENTITY_IMPORT_POPOVER_Z_CLASS } from '../../ui/entity-import-popover';
import {
  type ContributionDraft,
  ContributionsEditor,
  countRenderableEntries,
  getRenderableContributionEntries,
  promoteContributionToPrimary,
  summarizeContributions,
} from './contributions-editor';
import {
  LocationEditor,
  type LocationValue,
  parseLocationSummary,
  summarizeLocation,
} from './location-editor';
import {
  type CellMorphologyContributionInput,
  type CellMorphologyImportServices,
  type CellMorphologyRegistrationMetadata,
  createCellMorphologyImportServices,
} from './services';

import type {
  EntityImportAdapter,
  EntityImportRuntimeContext,
  RemoteValidationResult,
} from '../../core/adapter';

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

const contributionEntrySchema = z.object({
  agent_type: z.enum(contributionAgentKeys),
  agent_id: z.string().min(1, 'Contributor is required'),
  role_id: z.string().min(1, 'Role is required'),
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
  brain_region_id: z.uuid().nonempty({ message: 'Brain region is required' }),
  cell_morphology_protocol_id: z.uuid().nonempty({ message: 'Protocol is required' }),
  subject_id: z.uuid().nonempty({ message: 'Subject is required' }),
  license_id: z.uuid().nonempty({ message: 'License is required' }),
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
  mtype_class_id: z.uuid().nonempty({ message: 'M-type is required' }),
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
  services?: CellMorphologyImportServices;
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
  return (parsedValue as LocationValue | null) ?? parseLocationSummary(rawValue) ?? null;
}

function getProtocolGenerationType(row: ImportRowState): string | null {
  const protocolCell = row.cells.protocolId;

  if (protocolCell.remoteState.status !== 'valid') {
    return null;
  }

  const metadata = protocolCell.remoteState.selectedSuggestion?.metadata as
    | { generationType?: string }
    | undefined;

  return metadata?.generationType ?? null;
}

function hasDigitalReconstructionProtocol(row: ImportRowState): boolean {
  return getProtocolGenerationType(row) === CellMorphologyGenerationType.DigitalReconstruction.key;
}

function createSingleSuggestionRemoteValidator({
  label,
  search,
}: {
  label: string;
  search: (query: string, context: EntityImportRuntimeContext) => Promise<Array<ISuggestion>>;
}) {
  return async ({
    query,
    context,
  }: {
    query: string;
    context: EntityImportRuntimeContext;
  }): Promise<RemoteValidationResult> => {
    const suggestions = await search(query, context);

    if (suggestions.length === 1) {
      return {
        status: 'valid',
        resolvedSuggestion: suggestions[0],
      };
    }

    if (suggestions.length > 1) {
      return {
        status: 'invalid',
        message: `Multiple matches found for ${label}. Choose one in the validator.`,
        suggestions,
      };
    }

    return {
      status: 'invalid',
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
    label: entry.agent_label?.trim() || entry.agent_id?.trim() || 'Unnamed contributor',
    roleLabel: entry.role_label?.trim() || entry.role_id?.trim() || null,
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
  entries,
  onClick,
  onPromoteContribution,
}: {
  label: string;
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
        aria-label={label}
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
              className={cn(
                'inline-flex size-8 shrink-0 items-center justify-center self-center rounded-full border border-neutral-200',
                'text-sm font-semibold text-primary-9 transition hover:border-neutral-300 hover:bg-white bg-neutral-50'
              )}
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
            className={cn(
              ENTITY_IMPORT_POPOVER_Z_CLASS,
              'w-80 max-w-88 rounded-2xl border border-neutral-200 bg-white p-2 text-sm text-neutral-900 shadow-[0_16px_40px_rgba(0,0,0,0.16)]'
            )}
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
  defaultBrainRegionId,
  defaultLicenseId = DEFAULT_LICENSE_ID,
  services = createCellMorphologyImportServices(),
}: CreateCellMorphologyImportAdapterOptions): EntityImportAdapter<
  CellMorphologySubmissionPayload,
  { id: string; isValid: boolean }
> {
  return {
    id: 'cell-morphology-import',
    title: 'Cell Morphology Import',
    submitLabel: 'Import rows',
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
          search: async ({ query, context }) => services.searchBrainRegions(query, context),
          searchPage: async ({ query, context, pageParam, pageSize }) =>
            services.searchBrainRegionsPage(query, context, pageParam, pageSize),
          validate: async ({ query, context }) =>
            createSingleSuggestionRemoteValidator({
              label: 'Brain Region',
              search: services.searchBrainRegions,
            })({ query, context }),
        },
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
              (draftValue.parsedValue as LocationValue | null) ??
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
          search: async ({ query, context }) => services.searchSubjects(query, context),
          searchPage: async ({ query, context, pageParam, pageSize }) =>
            services.searchSubjectsPage(query, context, pageParam, pageSize),
          validate: async ({ query, context }) =>
            createSingleSuggestionRemoteValidator({
              label: 'Subject',
              search: services.searchSubjects,
            })({ query, context }),
        },
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
          search: async ({ query, context }) => services.searchLicenses(query, context),
          searchPage: async ({ query, context, pageParam, pageSize }) =>
            services.searchLicensesPage(query, context, pageParam, pageSize),
          validate: async ({ query, context }) =>
            createSingleSuggestionRemoteValidator({
              label: 'License',
              search: services.searchLicenses,
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
          search: async ({ query, context }) => services.searchProtocols(query, context),
          searchPage: async ({ query, context, pageParam, pageSize }) =>
            services.searchProtocolsPage(query, context, pageParam, pageSize),
          validate: async ({ query, context }) =>
            createSingleSuggestionRemoteValidator({
              label: 'Protocol',
              search: services.searchProtocols,
            })({ query, context }),
        },
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
          search: async ({ query, context }) => services.searchMtypes(query, context),
          searchPage: async ({ query, context, pageParam, pageSize }) =>
            services.searchMtypesPage(query, context, pageParam, pageSize),
          validate: async ({ query, context }) =>
            createSingleSuggestionRemoteValidator({
              label: 'M-Type',
              search: services.searchMtypes,
            })({ query, context }),
        },
        columnWidth: 180,
      },
      {
        label: 'Contributions',
        path: 'contributions',
        submissionPath: 'contribution',
        validationPath: 'contribution',
        required: true,
        inputType: ImportInputType.Compound,
        csv: { include: false },
        tableRenderer: ({ field, cell, row, actions }) => (
          <ContributionSummaryCell
            label={field.label}
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
          accept: ['application/swc'],
          allowedExtensions: ['.swc'],
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
      brainRegionId: defaultBrainRegionId,
      experimentDate: '',
      contactEmail: '',
      publishedIn: '',
      location: '',
      subjectId: '',
      licenseId: defaultLicenseId,
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
