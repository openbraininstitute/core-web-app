import { authApiClient } from '@/api/apiClient';

// const obioneUrl = env.NEXT_PUBLIC_OBI_ONE_URL!;
const obioneUrl = 'http://127.0.0.1:8100';

export async function obioneApi(url?: string) {
  const api = await authApiClient(url ?? obioneUrl);
  return api;
}
