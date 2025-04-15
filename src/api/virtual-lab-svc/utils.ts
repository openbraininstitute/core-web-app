import { virtualLabApi } from '@/config';
import authApiClient from '@/api/apiClient';

export async function virtualLabRootApi(url?: string) {
  const api = await authApiClient(url ?? virtualLabApi.url);
  return api;
}
