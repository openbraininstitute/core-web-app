import { obioneApi } from '@/api/one/utils';

export type NeuronResolution = {
  isValid: boolean;
  buffer: ArrayBuffer;
};

export type NeuronRegistered = {
  isValid: boolean;
  id: string;
};

export async function resolveNeuronFile(file: File): Promise<NeuronResolution> {
  const api = await obioneApi();
  const formData = new FormData();
  formData.append('file', file, file.name);
  const response = await api.post<Response>(
    '/declared/test-neuron-file',
    {
      headers: {
        accept: 'application/json',
      },
      body: formData,
    },
    { asRawResponse: true },
  );
  return {
    isValid: response.ok,
    buffer: await response.arrayBuffer(),
  };
}

export async function createAndRegisterMorphometrics(
  file: File,
  payload: Record<string, any>,
  context: { projectId: string; virtualLabId: string },
): Promise<{ isValid: boolean; id: string }> {
  const api = await obioneApi();
  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('metadata', JSON.stringify(payload));

  const response = await api.post<any>(
    '/declared/register-morphology-with-calculated-metrics',
    {
      headers: {
        'accept': 'application/json',
        'project-id': context.projectId,
        'virtual-lab-id': context.virtualLabId,
      },
      body: formData,
    },
    { asRawResponse: true },
  );

  const data = await response.json();

  return {
    isValid: response.ok,
    id: data.entity_id,
  };
}
