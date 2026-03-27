import { z } from 'zod';

import {
  ElectricalRecordingOrigin,
  RecordingType,
} from '@/api/entitycore/types/entities/electrical-cell-recording';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetContentType } from '@/api/entitycore/types/shared/global';
import { createElectricalCellRecordingImportServices } from '@/features/entity-import/adapters/electrical-cell-recording/services';
import { ImportInputType } from '@/features/entity-import/core/contracts';
import {
  createBrainRegionImportField,
  createContributionsImportField,
  createDescriptionImportField,
  createFileBundleImportField,
  createLicenseImportField,
  createNameImportField,
  createRemoteQuery,
  createSingleSuggestionRemoteEvaluator,
  createSubjectImportField,
  normalizeOptionalString,
  renderEtypeSuggestionDetails,
  sanitizeContributions,
} from '@/features/entity-import/core/shared/field-builders';
import {
  createEntityImportPostSubmitActions,
  type IEntityImportPostSubmitActions,
} from '@/features/entity-import/core/shared/post-submit-actions';
import { RECORDING_LOCATION_OPTIONS } from '@/ui/segments/contribute/electrical-cell-recording/schema';

import type { IElectricalCellRecordingImportServices } from '@/features/entity-import/adapters/electrical-cell-recording/services';
import type {
  IAdapterFieldDefinition,
  IEntityImportAdapter,
  IEntityImportRuntimeContext,
} from '@/features/entity-import/core/adapter';
import type { IImportRowState, TFlatImportValues } from '@/features/entity-import/core/contracts';

interface IElectricalCellRecordingSubmissionPayload {
  name: string;
  description: string;
  brain_region_id: string;
  subject_id: string;
  license_id: string;
  etype_class_id: string;
  experiment_date: string | null;
  contact_email: string | null;
  published_in: string | null;
  recording_location: string;
  recording_type: string;
  recording_origin: string;
  temperature: number | null;
  ljp: number;
  comment: string | null;
  contributions: Array<{ agent_id: string; role_id: string }>;
  asset: File;
}

const electricalCellRecordingSubmissionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  brain_region_id: z
    .uuid({ error: 'Brain region is required' })
    .nonempty({ message: 'Brain region is required' }),
  subject_id: z.uuid({ error: 'Subject is required' }).nonempty({ message: 'Subject is required' }),
  license_id: z.uuid({ error: 'License is required' }).nonempty({ message: 'License is required' }),
  etype_class_id: z
    .uuid({ error: 'E-type is required' })
    .nonempty({ message: 'E-type is required' }),
  experiment_date: z.string().nullable(),
  contact_email: z.union([z.email('Contact email must be valid'), z.null()]),
  published_in: z.string().nullable(),
  recording_location: z.string().min(1, 'Recording location is required'),
  recording_type: z.string().min(1, 'Recording type is required'),
  recording_origin: z.string().min(1, 'Recording origin is required'),
  temperature: z.number().nullable(),
  ljp: z.number(),
  comment: z.string().nullable(),
  contributions: z.array(z.object({ agent_id: z.string(), role_id: z.string() })).min(1),
  asset: z.instanceof(File),
});

const RECORDING_TYPE_OPTIONS = Object.values(RecordingType).map((entry) => ({
  value: entry.key,
  label: entry.label,
}));

const RECORDING_ORIGIN_OPTIONS = Object.values(ElectricalRecordingOrigin).map((entry) => ({
  value: entry.key,
  label: entry.label,
}));

interface CreateElectricalCellRecordingImportAdapterOptions {
  services?: IElectricalCellRecordingImportServices;
  postSubmitActions?: IEntityImportPostSubmitActions;
}

export function createElectricalCellRecordingImportAdapter({
  services = createElectricalCellRecordingImportServices(),
  postSubmitActions = createEntityImportPostSubmitActions(),
}: CreateElectricalCellRecordingImportAdapterOptions = {}): IEntityImportAdapter<
  IElectricalCellRecordingSubmissionPayload,
  { id: string }
> {
  const fields: Array<IAdapterFieldDefinition> = [
    createNameImportField({
      submissionPath: 'metadata.name',
      validationPath: 'metadata.name',
      placeholder: 'Recording name',
    }),
    createDescriptionImportField({
      submissionPath: 'metadata.description',
      validationPath: 'metadata.description',
      placeholder: 'Recording description',
    }),
    createBrainRegionImportField({
      path: 'brain_region_id',
      submissionPath: 'metadata.brain_region_id',
      validationPath: 'metadata.brain_region_id',
      services,
    }),
    createSubjectImportField({
      path: 'subject_id',
      submissionPath: 'metadata.subject_id',
      validationPath: 'metadata.subject_id',
      services,
    }),
    createLicenseImportField({
      path: 'license_id',
      submissionPath: 'metadata.license_id',
      validationPath: 'metadata.license_id',
      services,
    }),
    {
      label: 'E-type',
      path: 'etype_class_id',
      submissionPath: 'etype_class_id',
      validationPath: 'etype_class_id',
      required: true,
      inputType: ImportInputType.RemoteSelect,
      placeholder: 'Search e-type',
      remote: {
        query: createRemoteQuery({
          queryField: 'ilike_search',
          querySuggestions: services.queryEtype,
        }),
        evaluate: async ({ query, context }) =>
          createSingleSuggestionRemoteEvaluator({
            label: 'E-Type',
            queryField: 'pref_label__ilike',
            querySuggestions: services.queryEtype,
          })({ query, context }),
      },
      validatorSuggestionDetails: renderEtypeSuggestionDetails,
      columnWidth: 200,
    },
    {
      label: 'Recording Location',
      path: 'recording_location',
      submissionPath: 'metadata.recording_location',
      validationPath: 'metadata.recording_location',
      required: true,
      inputType: ImportInputType.Select,
      options: RECORDING_LOCATION_OPTIONS,
      placeholder: 'Select recording location',
      columnWidth: 180,
    },
    {
      label: 'Recording Type',
      path: 'recording_type',
      submissionPath: 'metadata.recording_type',
      validationPath: 'metadata.recording_type',
      required: true,
      inputType: ImportInputType.Select,
      options: RECORDING_TYPE_OPTIONS,
      placeholder: 'Select recording type',
      columnWidth: 180,
    },
    {
      label: 'Recording Origin',
      path: 'recording_origin',
      submissionPath: 'metadata.recording_origin',
      validationPath: 'metadata.recording_origin',
      required: true,
      inputType: ImportInputType.Select,
      options: RECORDING_ORIGIN_OPTIONS,
      placeholder: 'Select recording origin',
      columnWidth: 180,
    },
    {
      label: 'Experiment Date',
      path: 'experiment_date',
      submissionPath: 'metadata.experiment_date',
      validationPath: 'metadata.experiment_date',
      required: false,
      inputType: ImportInputType.Date,
      columnWidth: 140,
    },
    {
      label: 'Contact Email',
      path: 'contact_email',
      submissionPath: 'metadata.contact_email',
      validationPath: 'metadata.contact_email',
      required: false,
      inputType: ImportInputType.Text,
      placeholder: 'Contact email',
      columnWidth: 200,
    },
    {
      label: 'Published In',
      path: 'published_in',
      submissionPath: 'metadata.published_in',
      validationPath: 'metadata.published_in',
      required: false,
      inputType: ImportInputType.Text,
      placeholder: 'DOI or publication reference',
      columnWidth: 180,
    },
    {
      label: 'Temperature',
      path: 'temperature',
      submissionPath: 'metadata.temperature',
      validationPath: 'metadata.temperature',
      required: false,
      inputType: ImportInputType.Number,
      placeholder: 'Temperature (°C)',
      columnWidth: 140,
    },
    {
      label: 'LJP',
      path: 'ljp',
      submissionPath: 'metadata.ljp',
      validationPath: 'metadata.ljp',
      required: false,
      inputType: ImportInputType.Number,
      placeholder: 'Liquid junction potential',
      columnWidth: 140,
    },
    {
      label: 'Comment',
      path: 'comment',
      submissionPath: 'metadata.comment',
      validationPath: 'metadata.comment',
      required: false,
      inputType: ImportInputType.Textarea,
      placeholder: 'Additional notes',
      columnWidth: 220,
    },
    createContributionsImportField({ services }),
    createFileBundleImportField({
      label: 'NWB File',
      path: 'asset',
      submissionPath: 'asset',
      validationPath: 'asset',
      fileConfig: {
        accept: [AssetContentType.nwb],
        allowedExtensions: ['.nwb'],
        maxSizeBytes: 500 * 1024 * 1024,
        maxFiles: 1,
      },
    }),
  ];

  return {
    id: 'electrical-cell-recording-import',
    title: 'Electrical Cell Recording Import',
    submitLabel: 'Import',
    templateFileName: 'Electrical Cell Recording csv template and guide',
    templateGuide: {
      entityType: ExtendedEntitiesTypeDict.ElectricalCellRecording,
      guideFileName: 'electrical-cell-recording-import-template.md',
    },
    fields,
    schema: electricalCellRecordingSubmissionSchema,
    buildPayload({
      row,
      values,
    }: {
      row: IImportRowState;
      values: TFlatImportValues;
      context: IEntityImportRuntimeContext;
    }): IElectricalCellRecordingSubmissionPayload {
      const assetCell = row.cells.asset;
      const files = Array.isArray(assetCell.parsedValue)
        ? (assetCell.parsedValue as Array<File>)
        : assetCell.parsedValue instanceof File
          ? [assetCell.parsedValue]
          : [];

      return {
        name: values.name,
        description: values.description,
        brain_region_id: row.cells.brain_region_id?.remoteState.selectedSuggestion?.value ?? '',
        subject_id: row.cells.subject_id?.remoteState.selectedSuggestion?.value ?? '',
        license_id: row.cells.license_id?.remoteState.selectedSuggestion?.value ?? '',
        etype_class_id: row.cells.etype_class_id?.remoteState.selectedSuggestion?.value ?? '',
        experiment_date: normalizeOptionalString(values.experiment_date ?? ''),
        contact_email: normalizeOptionalString(values.contact_email ?? ''),
        published_in: normalizeOptionalString(values.published_in ?? ''),
        recording_location: values.recording_location,
        recording_type: values.recording_type,
        recording_origin: values.recording_origin || 'in_vitro',
        temperature: values.temperature ? Number(values.temperature) || null : null,
        ljp: values.ljp ? Number(values.ljp) || 0 : 0,
        comment: normalizeOptionalString(values.comment ?? ''),
        contributions: sanitizeContributions(row.cells.contributions?.parsedValue),
        asset: files[0] ?? new File([], ''),
      };
    },
    async submitRow({ payload, context }) {
      const result = await services.registerRecording({
        metadata: {
          name: payload.name,
          description: payload.description,
          brain_region_id: payload.brain_region_id,
          subject_id: payload.subject_id,
          license_id: payload.license_id,
          experiment_date: payload.experiment_date,
          contact_email: payload.contact_email,
          published_in: payload.published_in,
          location: null,
          recording_location: payload.recording_location ? [payload.recording_location] : [],
          recording_type: payload.recording_type,
          recording_origin: payload.recording_origin,
          temperature: payload.temperature,
          ljp: payload.ljp,
          comment: payload.comment,
        },
        context,
      });

      const entityId = result.id;

      await Promise.allSettled([
        services.createEtypeClassification({
          entityId,
          etypeClassId: payload.etype_class_id,
          context,
        }),
        ...payload.contributions.map((contribution) =>
          postSubmitActions.createContribution({
            entityId,
            contribution,
            context,
          })
        ),
        payload.asset.size > 0
          ? services.uploadAsset({ entityId, file: payload.asset, context })
          : Promise.resolve(),
      ]);

      return { id: entityId };
    },
  };
}
