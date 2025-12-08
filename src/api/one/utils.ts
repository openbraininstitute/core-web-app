import { authApiClient } from '@/api/apiClient';
import { env } from '@/env';

const obioneUrl = env.NEXT_PUBLIC_OBI_ONE_URL!;

export async function obioneApi(url?: string) {
  const api = await authApiClient(url ?? obioneUrl);
  return api;
}
