'use client';

import { z } from 'zod';

import { CellMorphologyGenerationType } from '@/api/entitycore/types/entities/cell-morphology-protocol';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetContentType } from '@/api/entitycore/types/shared/global';
import {
  RepairPipelineState,
  RepairPipelineTypeSchema,
  type TRepairPipelineState,
} from '@/api/entitycore/types/shared/protocol';
import {
  type IEntityImportAdapter,
  type IValidatorSuggestionDetailsArgs,
  ValidatorWriteStrategy,
} from '@/features/entity-import/core/adapter';
import {
  type IImportRowState,
  ImportInputType,
  RemoteValidationStatus,
} from '@/features/entity-import/core/contracts';
import {
  makeBrainRegionImportField,
  makeContributionsImportField,
  makeDescriptionImportField,
  makeExactOnlyRemoteEvaluator,
  makeFileBundleImportField,
  makeLicenseImportField,
  makeMtypeImportField,
  makeNameImportField,
  makeRemoteQuery,
  makeSubjectImportField,
  normalizeOptionalString,
  readSuggestionString,
  renderSuggestionDetailRows,
  sanitizeContributions,
} from '@/features/entity-import/core/shared/field-builders';
import {
  createEntityImportPostSubmitActions,
  type IEntityImportPostSubmitActions,
} from '@/features/entity-import/core/shared/post-submit-actions';
import {
  LocationEditor,
  type LocationValue,
  normalizeLocationValue,
  parseLocationSummary,
  summarizeLocation,
} from '@/ui/segments/contribute/multiple/adapters/cell-morphology/location-editor';
import { parseLocationCsvValue } from '@/ui/segments/contribute/multiple/adapters/cell-morphology/location-parser';
import {
  type CellMorphologyContributionInput,
  type CellMorphologyRegistrationMetadata,
  createCellMorphologyImportServices,
  type ICellMorphologyImportServices,
} from '@/ui/segments/contribute/multiple/adapters/cell-morphology/services';
import { AgentType } from '@/ui/segments/contribute/shared/types';

const REPAIR_PIPELINE_STATE_OPTIONS = Object.values(RepairPipelineState).map((option) => ({
  value: option.key,
  label: option.label,
}));

const contributionAgentKeys = [
  AgentType.Person.key,
  AgentType.Organization.key,
  AgentType.Consortium.key,
] as const;

function renderProtocolSuggestionDetails({ suggestion }: IValidatorSuggestionDetailsArgs) {
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

const contributionEntrySchema = z.object({
  agent_type: z.enum(contributionAgentKeys),
  agent_id: z
    .uuid({ error: 'Contributor is required' })
    .nonempty({ message: 'Contributor is required' }),
  role_id: z.string({ error: 'Contributor role is required' }).min(1, 'Role is required'),
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
  services?: ICellMorphologyImportServices;
  postSubmitActions?: IEntityImportPostSubmitActions;
}

function readLocation(parsedValue: unknown, rawValue: string): LocationValue | null {
  return normalizeLocationValue(parsedValue) ?? parseLocationSummary(rawValue) ?? null;
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

export function createCellMorphologyImportAdapter({
  services = createCellMorphologyImportServices(),
  postSubmitActions = createEntityImportPostSubmitActions(),
}: CreateCellMorphologyImportAdapterOptions): IEntityImportAdapter<
  CellMorphologySubmissionPayload,
  { id: string; isValid: boolean }
> {
  return {
    id: 'cell-morphology-import',
    title: 'Cell Morphology Import',
    submitLabel: 'Import',
    templateFileName: 'Cell Morphology csv template and guide',
    templateGuide: {
      entityType: ExtendedEntitiesTypeDict.CellMorphology,
      guideFileName: 'cell-morphology-import-template.md',
    },
    fields: [
      makeNameImportField({
        submissionPath: 'setup.name',
        validationPath: 'metadata.name',
      }),
      makeDescriptionImportField({
        submissionPath: 'setup.description',
        validationPath: 'metadata.description',
      }),
      makeBrainRegionImportField({
        path: 'brainRegionId',
        submissionPath: 'setup.brain_region_id',
        validationPath: 'metadata.brain_region_id',
        services,
      }),
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
        writeStrategy: ValidatorWriteStrategy.Stage,
        tableRenderer: ({ cell, row, field, actions, validatorPreview }) => (
          <LocationEditor
            cell={cell}
            row={row}
            fieldPath={field.path}
            actions={actions}
            mode="table"
            validatorPreview={validatorPreview}
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
      makeSubjectImportField({
        path: 'subjectId',
        submissionPath: 'subject_id',
        validationPath: 'metadata.subject_id',
        services,
      }),
      makeLicenseImportField({
        path: 'licenseId',
        submissionPath: 'license_id',
        validationPath: 'metadata.license_id',
        services,
      }),
      {
        label: 'Protocol',
        path: 'protocolId',
        submissionPath: 'cell_morphology_protocol_id',
        validationPath: 'metadata.cell_morphology_protocol_id',
        required: true,
        inputType: ImportInputType.RemoteSelect,
        placeholder: 'Search protocol',
        remote: {
          query: makeRemoteQuery({
            queryField: 'ilike_search',
            querySuggestions: services.queryProtocol,
          }),
          evaluate: async ({ query, context }) =>
            makeExactOnlyRemoteEvaluator({
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
      makeMtypeImportField({
        path: 'mtypeClassId',
        submissionPath: 'mtype_class_id',
        validationPath: 'mtype_class_id',
        services,
      }),
      makeContributionsImportField({ services }),
      makeFileBundleImportField({
        label: 'Morphology File',
        path: 'sourceFile',
        submissionPath: 'assets.sourceFile',
        validationPath: 'sourceFile',
        fileConfig: {
          accept: [AssetContentType.swc, AssetContentType.asc, AssetContentType.h5],
          allowedExtensions: ['.swc', '.asc', '.h5', '.H5', '.SWC', '.ASC'],
          maxFiles: 1,
        },
      }),
    ],
    schema: cellMorphologySubmissionSchema as z.ZodType<CellMorphologySubmissionPayload>,
    createBlankRow: () => ({
      sourceFile: '',
      name: '',
      description: '',
      brainRegionId: '',
      experimentDate: '',
      contactEmail: '',
      publishedIn: '',
      location: '',
      subjectId: '',
      licenseId: '',
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
        await postSubmitActions.createContribution({
          entityId: registration.id,
          contribution: contribution as CellMorphologyContributionInput,
          context,
        });
      }

      await postSubmitActions.createMtypeClassification({
        entityId: registration.id,
        mtypeClassId: payload.mtype_class_id,
        context,
      });

      return registration;
    },
  };
}
