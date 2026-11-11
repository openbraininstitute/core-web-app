import { authApiClient } from '@/api/api-client';
import { config } from '@/config';

export async function smallScaleSimulatorApi(url?: string) {
  const api = await authApiClient(url ?? config.SMALL_SCALE_SIMULATOR_URL);
  return api;
}
