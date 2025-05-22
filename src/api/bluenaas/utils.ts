import authApiClient from '@/api/apiClient';
import { blueNaasUrl } from '@/config';

export async function bluenaasApi(url?: string) {
  const api = await authApiClient(url ?? blueNaasUrl);
  return api;
}
