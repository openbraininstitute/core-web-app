import { obioneApi } from '@/api/one/utils';

export type NeuronResolution = {
  isValid: boolean;
  buffer: ArrayBuffer;
};

export type NeuronFileError = {
  code: string;
  detail: string;
};

export type NeuronRegistered = {
  isValid: boolean;
  id: string;
};

type ErrorEnvelope = { 
  detail: NeuronFileError 
};

export function isNeuronFileError(err: unknown): err is Error & { neuronFileError: NeuronFileError } {
  return (
    err instanceof Error &&
    'neuronFileError' in err &&
    typeof (err as any).neuronFileError === 'object'
  );
}

export async function resolveNeuronFile(file: File): Promise<NeuronResolution> {
  const api = await obioneApi();
  const formData = new FormData();
  formData.append('file', file, file.name);

  const response = await api.post<Response>(
    '/declared/test-neuron-file',
    { body: formData },
    { asRawResponse: true, passThroughErrors: true } // ✅ Correct
  );

  if (!response.ok) {
    const envelope: ErrorEnvelope = await response.json().catch(() => ({
      detail: { code: 'UNKNOWN', detail: `Request failed with status ${response.status}` },
    }));
    
    const errorBody: NeuronFileError = typeof envelope.detail === 'object'
      ? envelope.detail
      : { code: 'UNKNOWN', detail: String(envelope.detail) };
    
    const error = new Error(errorBody.detail);
    (error as any).neuronFileError = errorBody;
    throw error;
  }

  return {
    isValid: true,
    buffer: await response.arrayBuffer(),
  };
}

export async function createAndRegisterMorphometrics(
  file: File,
  payload: Record<string, any>,
  context: { projectId: string; virtualLabId: string }
): Promise<{ isValid: boolean; id: string }> {
  const api = await obioneApi();
  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('metadata', JSON.stringify(payload));

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
    { asRawResponse: true, passThroughErrors: true } // ✅ Fixed: Passed passThroughErrors flag
  );

  if (!response.ok) {
    const envelope: ErrorEnvelope = await response.json().catch(() => {
      let code = 'SERVER_ERROR';
      if (response.status === 401) code = 'UNAUTHENTICATED';
      if (response.status === 403) code = 'FORBIDDEN';
      if (response.status === 404) code = 'NOT_FOUND';
      if (response.status === 413) code = 'FILE_TOO_LARGE';

      return {
        detail: { 
          code, 
          detail: `Request failed with status ${response.status}: ${response.statusText}` 
        },
      };
    });

    const errorBody: NeuronFileError = typeof envelope.detail === 'object'
      ? envelope.detail
      : { code: 'UNKNOWN', detail: String(envelope.detail) };

    const error = new Error(errorBody.detail);
    (error as any).neuronFileError = errorBody;
    throw error;
  }

  const data = await response.json();

  return {
    isValid: true,
    id: data.entity_id,
  };
}