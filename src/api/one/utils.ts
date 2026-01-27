//import { authApiClient } from '@/api/apiClient';
//import { config } from '@/config';

//export async function obioneApi(url?: string) {
//  const api = await authApiClient(url ?? config.OBI_ONE_URL);
//  return api;
//}

import { authApiClient } from '@/api/apiClient';
import { config } from '@/config';

const obioneUrl = 'http://127.0.0.1:8100';

export async function obioneApi(url?: string) {
  const api = await authApiClient(url ?? obioneUrl);
  return api;
}
