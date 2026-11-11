import { authApiClient } from '@/api/api-client';
import { config } from '@/config';

export async function virtualLabRootApi(url?: string) {
  // biome-ignore lint/style/noNonNullAssertion: should be defined at runtime
  const api = await authApiClient(url ?? config.VIRTUAL_LAB_API_URL!);
  return api;
}
