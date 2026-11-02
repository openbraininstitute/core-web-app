import { ApiError } from '@/api/error';
import { obioneApi } from '@/api/one/utils';

export type TNeuronResolution =
  | { isValid: true; buffer: ArrayBuffer }
  | { isValid: false; validationError: string };

export async function resolveNeuronFile(file: File): Promise<TNeuronResolution> {
  const api = await obioneApi();
  const formData = new FormData();
  formData.append('file', file, file.name);

  try {
    const response = await api.post<Response>(
      '/declared/test-neuron-file',
      {
        headers: {
          accept: 'application/json',
        },
        body: formData,
      },
      { asRawResponse: true }
    );
    return { isValid: true, buffer: await response.arrayBuffer() };
  } catch (error) {
    if (error instanceof ApiError && error.cause?.status === 422) {
      // biome-ignore lint/suspicious/noControlCharactersInRegex: the ESC is what an ANSI code is
      return { isValid: false, validationError: error.message.replace(/\x1b?\[[\d;]*m/g, '') };
    }
    throw error;
  }
}

export type TMorphologyRegistration = {
  id: string;
  /** `active`, or `disqualified` when the file failed validation and was stored anyway. */
  lifecycleStatus: string;
  validationError: string | null;
};

export async function createAndRegisterMorphometrics(
  file: File,
  payload: Record<string, any>,
  context: { projectId: string; virtualLabId: string }
): Promise<TMorphologyRegistration> {
  const api = await obioneApi();
  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('metadata', JSON.stringify(payload));

  // A file that failed validation now comes back 200 with lifecycle_status "disqualified";
  // anything the client does not accept as 2xx throws.
  const response = await api.post<Response>(
    '/declared/register-morphology-with-calculated-metrics',
    {
      headers: {
        accept: 'application/json',
        'project-id': context.projectId,
        'virtual-lab-id': context.virtualLabId,
      },
      body: formData,
    },
    { asRawResponse: true }
  );

  const data = await response.json();

  return {
    id: data.entity_id,
    lifecycleStatus: data.lifecycle_status,
    validationError: data.validation_error ?? null,
  };
}
