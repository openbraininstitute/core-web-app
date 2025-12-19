import { obioneApi } from '@/api/one/utils';

export type NeuronResolution = {
  isValid: boolean;
  buffer: ArrayBuffer;
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
