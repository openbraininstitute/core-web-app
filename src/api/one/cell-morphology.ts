import { obioneApi } from '@/api/one/utils';
import ApiError from '@/api/error';

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

  try {
    const response = await api.post<Response>(
      '/declared/test-neuron-file',
      { 
        body: formData,
        asRawResponse: true 
      }
    );

    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      const errorJson = await response.json().catch(() => ({}));
      let code = 'VALIDATION_ERROR';
      let detail = 'Invalid neuron file structure';

      if (errorJson?.detail) {
        if (typeof errorJson.detail === 'object') {
          code = errorJson.detail.code || code;
          detail = errorJson.detail.detail || detail;
        } else {
          detail = String(errorJson.detail);
        }
      } else if (errorJson?.message) {
        detail = errorJson.message;
      }

      const errorBody: NeuronFileError = { code, detail };
      const customError = new Error(errorBody.detail);
      (customError as any).neuronFileError = errorBody;
      throw customError;
    }

    return {
      isValid: true,
      buffer: await response.arrayBuffer(),
    };
  } catch (error: any) {
    if (error && 'neuronFileError' in error) {
      throw error;
    }

    let code = 'UNKNOWN';
    let detail = error.message || 'Request failed';

    if (error instanceof ApiError && error.cause) {
      const cause = error.cause;
      code = cause.code || code;
      
      const rawPayload = cause.details || cause.originalError;
      if (rawPayload && typeof rawPayload === 'object') {
        if (rawPayload.detail && typeof rawPayload.detail === 'object') {
          code = rawPayload.detail.code || code;
          detail = rawPayload.detail.detail || detail;
        } else {
          detail = rawPayload.detail || rawPayload.message || detail;
        }
      } else if (typeof rawPayload === 'string') {
        detail = rawPayload;
      }
    }

    const errorBody: NeuronFileError = { code, detail };
    const customError = new Error(errorBody.detail);
    
    (customError as any).neuronFileError = errorBody;
    throw customError;
  }
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

  try {
    const data = await api.post<{ entity_id: string }>(
      '/declared/register-morphology-with-calculated-metrics',
      {
        headers: {
          accept: 'application/json',
          'project-id': context.projectId,
          'virtual-lab-id': context.virtualLabId,
        },
        body: formData,
      }
    );

    return {
      isValid: true,
      id: data.entity_id,
    };
  } catch (error: any) {
    let code = 'SERVER_ERROR';
    let detail = error.message;

    if (error instanceof ApiError) {
      const cause = error.cause;
      const status = cause?.status;

      if (status === 401) code = 'UNAUTHENTICATED';
      else if (status === 403) code = 'FORBIDDEN';
      else if (status === 404) code = 'NOT_FOUND';
      else if (status === 413) code = 'FILE_TOO_LARGE';
      else if (cause?.code) code = cause.code;

      const rawPayload = cause?.details || cause?.originalError;
      if (rawPayload && typeof rawPayload === 'object') {
        if (rawPayload.detail && typeof rawPayload.detail === 'object') {
          detail = rawPayload.detail.detail || detail;
        } else {
          detail = rawPayload.detail || rawPayload.message || detail;
        }
      } else if (typeof rawPayload === 'string') {
        detail = rawPayload;
      }
    }

    const errorBody: NeuronFileError = { code, detail };
    const customError = new Error(errorBody.detail);
    
    (customError as any).neuronFileError = errorBody;
    throw customError;
  }
}