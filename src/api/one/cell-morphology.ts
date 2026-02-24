import { obioneApi } from '@/api/one/utils';

export type NeuronResolution = {
  isValid: boolean;
  buffer: ArrayBuffer;
};

export type NeuronRegistered = {
  isValid: boolean;
  id: string;
};

// Define an interface to safely extend Error without using 'any'
interface EnhancedError extends Error {
  code?: string | number;
}

export async function resolveNeuronFile(file: File): Promise<NeuronResolution> {
  const api = await obioneApi();
  const formData = new FormData();
  formData.append('file', file, file.name);

  const url = '/declared/test-neuron-file';
  const response = await api.post<Response>(
    url,
    {
      headers: { accept: 'application/json' },
      body: formData,
    },
    { asRawResponse: true }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const nested = errorData?.detail;
    const message =
      (typeof nested === 'object' ? nested?.detail : nested) ||
      errorData?.message ||
      `Request failed with status ${response.status}`;

    const ansiRegex = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
    const cleanMessage = message.replace(ansiRegex, '');

    // Fix: Use the interface instead of 'any'
    const err = new Error(cleanMessage) as EnhancedError;
    err.code = typeof nested === 'object' ? nested?.code : undefined;
    throw err;
  }

  return {
    isValid: true,
    buffer: await response.arrayBuffer(),
  };
}

export async function createAndRegisterMorphometrics(
  file: File,
  payload: Record<string, unknown>, // Fix: Changed 'any' to 'unknown'
  context: { projectId: string; virtualLabId: string }
): Promise<{ isValid: boolean; id: string }> {
  const api = await obioneApi();
  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('metadata', JSON.stringify(payload));

  // Fix: Explicitly typed the post response instead of 'any'
  const response = await api.post<{ entity_id: string }>(
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

  const data = await (response as unknown as Response).json();

  return {
    isValid: (response as unknown as Response).ok,
    id: data.entity_id,
  };
}
