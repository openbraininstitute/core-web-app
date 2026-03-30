import { authApiClient } from '@/api/api-client';
import { config } from '@/config';

export async function obioneApi(url?: string) {
  const api = await authApiClient(url ?? config.OBI_ONE_URL);
  return api;
}
