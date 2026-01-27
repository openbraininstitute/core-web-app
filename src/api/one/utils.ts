import { authApiClient } from '@/api/apiClient';
import { config } from '@/config';

export async function obioneApi(url?: string) {
  const api = await authApiClient(url ?? config.OBI_ONE_URL);
  return api;
}
