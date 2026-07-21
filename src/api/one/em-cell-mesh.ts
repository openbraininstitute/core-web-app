import { obioneApi } from '@/api/one/utils';

export type MeshResolution = {
  isValid: boolean;
  buffer: ArrayBuffer;
};

export async function resolveMeshFile(file: File): Promise<MeshResolution> {
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