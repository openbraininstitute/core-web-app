import { authApiClient } from '@/api/api-client';
import { config } from '@/config';

export async function virtualLabRootApi(url?: string) {
  const api = await authApiClient(url ?? config.VIRTUAL_LAB_API_URL);
  return api;
}
