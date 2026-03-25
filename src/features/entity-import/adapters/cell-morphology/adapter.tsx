'use client';

import { EditOutlined, PlusOutlined, SmallDashOutlined } from '@ant-design/icons';
import { RiEditBoxLine } from '@remixicon/react';
import { z } from 'zod';

import { Button } from '@/ui/molecules/button';
import { AgentType } from '@/ui/segments/contribute/shared/types';

import { ImportInputType, type ISuggestion } from '../../core/contracts';
import { type ContributionDraft, ContributionsEditor } from './contributions-editor';
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

import type { EntityImportAdapter } from '../../core/adapter';

const DEFAULT_LICENSE_ID = 'ad8686db-3cdd-4e3f-bcbd-812380a9eba7';

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

function getContributionPreview(entries: unknown): {
  primaryLabel: string;
  roleLabel: string | null;
  hasOverflow: boolean;
} | null {
  const contributions = sanitizeContributions(entries);
  const primary = contributions[0];
  if (!primary) {
    return null;
  }

  return {
    primaryLabel: primary.agent_label?.trim() || primary.agent_id?.trim() || 'Unnamed contributor',
    roleLabel: primary.role_label?.trim() || primary.role_id?.trim() || null,
    hasOverflow: contributions.length > 1,
  };
}

function contributionSummaryTrigger({
  label,
  entries,
  onClick,
}: {
  label: string;
  entries: unknown;
  onClick: () => void;
}) {
  const preview = getContributionPreview(entries);

  return (
    <Button
      type="button"
      aria-label={label}
      variant="ghost"
      size="md"
      className="h-full min-h-[52px] w-full justify-between rounded-none border-0 bg-transparent px-3 py-2 text-left shadow-none hover:bg-neutral-50"
      onClick={onClick}
    >
      <span className="min-w-0 flex-1 text-left">
        <span
          className="block truncate text-sm font-medium text-neutral-900"
          title={preview?.primaryLabel}
        >
          {preview?.primaryLabel || (
            <div className="flex items-center gap-1 font-bold text-primary-9 hover:text-primary-7">
              Add {label.toLowerCase()}
              <RiEditBoxLine />
            </div>
          )}
        </span>
        {preview?.roleLabel ? (
          <span className="block truncate text-xs text-neutral-500" title={preview.roleLabel}>
            {preview.roleLabel}
          </span>
        ) : null}
      </span>
      {preview?.hasOverflow ? (
        <span
          role="img"
          aria-label="More contributions"
          className="ml-3 inline-flex size-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
        >
          <SmallDashOutlined />
        </span>
      ) : null}
    </Button>
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
    description:
      'Upload a CSV or fill the table directly, then resolve flagged fields from the validator before importing.',
    submitLabel: 'Import rows',
    templateFileName: 'cell-morphology-import-template.csv',
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
        },
        columnWidth: 220,
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
        tableRenderer: ({ field, cell, row, actions }) =>
          contributionSummaryTrigger({
            label: `${field.label}`,
            entries: cell.parsedValue,
            onClick: () => actions.selectCell({ rowId: row.id, fieldPath: field.path }),
          }),
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
        placeholder: 'Attach morphology file',
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
      mtypeClassId: '',
      contributions: '',
    }),
    buildPayload: ({ row, values, context }) => {
      const sourceFile = row.cells.sourceFile.parsedValue as File | null;
      const contributions = sanitizeContributions(row.cells.contributions.parsedValue);
      const location = readLocation(row.cells.location.parsedValue, row.cells.location.rawValue);

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
          project_id: context.projectId,
          virtual_lab_id: context.virtualLabId,
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
