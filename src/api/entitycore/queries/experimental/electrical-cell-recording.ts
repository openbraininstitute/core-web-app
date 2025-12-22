import z from 'zod';
import type {
  ElectricalCellRecordingFilter,
  IElectricalCellRecording,
} from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import type { WorkspaceContext } from '@/types/common';
import { compactRecord } from '@/utils/dictionary';

const baseUri = '/electrical-cell-recording';
/**
 * Retrieves a list of electrical cell recordings from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {ElectricalCellRecordingFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<IElectricalCellRecording>>} A promise that resolves to the list of electrical cell recordings
 */
export async function getElectricalCellRecordings({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: ElectricalCellRecordingFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IElectricalCellRecording>>(baseUri, {
    queryParams: compactRecord({
      ...filters,
      with_facets: withFacets,
    }),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a specific electrical cell recording by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the recording to retrieve
 * @returns {Promise<IElectricalCellRecording>} A promise that resolves to the requested recording
 */
export async function getElectricalCellRecording({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IElectricalCellRecording>(`${baseUri}/${id}`, {
    // TODO: add expand parameter if/when supported by the API
    // queryParams: {
    //   expand,
    // },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

const electricalCellRecordingSchema = z.object({
  name: z
    .string({ message: 'Cell recording name is required' })
    .nonempty({ message: 'Cell recording name is required' }),
  description: z
    .string({ message: 'Cell recording description is required' })
    .nonempty({ message: 'Cell recording description is required' }),
  brain_region_id: z
    .string({ message: 'Brain region is required' })
    .uuid()
    .nonempty({ message: 'Brain region is required' }),
  subject_id: z
    .string({ message: 'Subject is required' })
    .uuid()
    .nonempty({ message: 'Subject is required' }),
  license_id: z
    .string({ message: 'License is required' })
    .uuid()
    .nonempty({ message: 'License is required' }),
  experiment_date: z.string({ message: 'Experiment date is required' }).nullish(),
  contact_email: z
    .string({ message: 'Contact email is required' })
    .email({ message: 'Contact email is required' })
    .nullish(),
  published_in: z.string({ message: 'Published in is required' }).nullish(),
  location: z.object({ x: z.number(), y: z.number(), z: z.number() }).nullable(),
  recording_location: z
    .array(
      z
        .string({ message: 'Cell recording location is required' })
        .nonempty({ message: 'Cell recording location is required' })
    )
    .nullable(),
  recording_type: z.string({ message: 'Cell recording type is required' }).nonempty({
    message: 'Cell recording type is required',
  }),
  recording_origin: z.string({ message: 'Cell recording origin is required' }).nonempty({
    message: 'Cell recording origin is required',
  }),
  temperature: z
    .number({ invalid_type_error: 'Temperature must be a number' })
    .optional()
    .nullable(),
  ljp: z
    .number({
      invalid_type_error: 'Liquid junction potential (ljp) must be a number',
    })
    .optional()
    .default(0.0),
  comment: z.string().optional().nullable(),
});

export type TElectricalCellRecordingCreate = z.infer<typeof electricalCellRecordingSchema>;

/**
 * Creates a new cell recording
 * @param param0
 * @returns A promise that resolves to the created cell morphology
 */
export async function createElectricalCellRecording({
  context,
  payload,
}: {
  context?: WorkspaceContext | null;
  payload: TElectricalCellRecordingCreate;
}) {
  const api = await entityCoreApi();
  return await api.post<IElectricalCellRecording>(baseUri, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body: payload,
  });
}
