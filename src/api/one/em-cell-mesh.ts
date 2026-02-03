import { obioneApi } from '@/api/one/utils';

export type OBJResolution = {
  isValid: boolean;
  buffer: ArrayBuffer;
};

export async function resolveOBJFile(file: File): Promise<OBJResolution> {
  const api = await obioneApi();
  const formData = new FormData();
  formData.append('file', file, file.name);
  const response = await api.post<Response>(
    '/declared/test-mesh-file',
    {
      headers: {
        accept: 'application/json',
      },
      body: formData,
    },
    { asRawResponse: true }
  );
  return {
    isValid: response.ok,
    buffer: await response.arrayBuffer(),
  };
}
