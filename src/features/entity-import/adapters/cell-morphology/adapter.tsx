'use client';

import { z } from 'zod';

import { Button } from '@/ui/molecules/button';
import { AgentType } from '@/ui/segments/contribute/shared/types';

import { ImportInputType, type Suggestion } from '../../core/contracts';
import { type ContributionDraft, ContributionsEditor } from './contributions-editor';
import { LocationEditor, type LocationValue, parseLocationSummary } from './location-editor';
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
  brain_region_id: z.string().min(1, 'Brain region is required'),
  cell_morphology_protocol_id: z.string().min(1, 'Protocol is required'),
  subject_id: z.string().min(1, 'Subject is required'),
  license_id: z.string().min(1, 'License is required'),
  experiment_date: z.string().nullable(),
  contact_email: z.union([z.string().email('Contact email must be valid'), z.null()]),
  published_in: z.string().nullable(),
  location: locationSchema,
  project_id: z.string().min(1),
  virtual_lab_id: z.string().min(1),
});

export const cellMorphologySubmissionSchema = z.object({
  sourceFile: z.instanceof(File, { message: 'Morphology file is required' }),
  metadata: metadataSchema,
  contribution: z.array(contributionEntrySchema).min(1, 'At least one contribution is required'),
  mtype_class_id: z.string().min(1, 'M-type is required'),
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

function summaryTrigger(label: string, rawValue: string, onClick: () => void) {
  return (
    <Button
      rounded
      type="button"
      aria-label={label}
      variant="outline"
      size="md"
      className="w-full justify-start text-left"
      onClick={onClick}
    >
      {rawValue || `Edit ${label.toLowerCase()}`}
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
        label: 'Morphology File',
        path: 'sourceFile',
        submissionPath: 'assets.sourceFile',
        validationPath: 'sourceFile',
        required: true,
        inputType: ImportInputType.FileBundle,
        csv: { include: false },
        placeholder: 'Attach morphology file',
      },
      {
        label: 'Name',
        path: 'name',
        submissionPath: 'setup.name',
        validationPath: 'metadata.name',
        required: true,
        inputType: ImportInputType.Text,
      },
      {
        label: 'Description',
        path: 'description',
        submissionPath: 'setup.description',
        validationPath: 'metadata.description',
        required: true,
        inputType: ImportInputType.Textarea,
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
        },
      },
      {
        label: 'Experiment Date',
        path: 'experimentDate',
        submissionPath: 'setup.experiment_date',
        validationPath: 'metadata.experiment_date',
        required: false,
        inputType: ImportInputType.Date,
      },
      {
        label: 'Contact Email',
        path: 'contactEmail',
        submissionPath: 'setup.contact_email',
        validationPath: 'metadata.contact_email',
        required: false,
        inputType: ImportInputType.Text,
      },
      {
        label: 'Published In',
        path: 'publishedIn',
        submissionPath: 'setup.published_in',
        validationPath: 'metadata.published_in',
        required: false,
        inputType: ImportInputType.Text,
      },
      {
        label: 'Location',
        path: 'location',
        submissionPath: 'setup.location',
        validationPath: 'metadata.location',
        required: false,
        inputType: ImportInputType.Compound,
        tableRenderer: ({ field, cell, row, actions }) =>
          summaryTrigger(`${field.label} row ${row.rowIndex + 1}`, cell.rawValue, () =>
            actions.selectCell({ rowId: row.id, fieldPath: field.path })
          ),
        panelRenderer: ({ cell, row, field, actions }) => (
          <LocationEditor cell={cell} row={row} fieldPath={field.path} actions={actions} />
        ),
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
        },
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
        },
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
        },
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
        },
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
          summaryTrigger(`${field.label} row ${row.rowIndex + 1}`, cell.rawValue, () =>
            actions.selectCell({ rowId: row.id, fieldPath: field.path })
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
  suggestions: Array<Suggestion>,
  candidate: Suggestion
): boolean {
  return suggestions.some(
    (suggestion) => suggestion.value === candidate.value && suggestion.recommended
  );
}
