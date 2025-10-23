import { authApiClient } from '@/api/apiClient';
import { virtualLabApi } from '@/config';

export async function virtualLabRootApi(url?: string) {
  const api = await authApiClient(url ?? virtualLabApi.url);
  return api;
}
