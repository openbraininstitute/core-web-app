import { authApiClient } from '@/api/apiClient';
import { smallScaleSimulatorUrl } from '@/config';

export async function smallScaleSimulatorApi(url?: string) {
  const api = await authApiClient(url ?? smallScaleSimulatorUrl);
  return api;
}
