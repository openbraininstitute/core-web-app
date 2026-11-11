import { fetchJSON } from './util';

export async function serviceAiAgentHealthCheck(accessToken: string): Promise<boolean> {
  try {
    await fetchJSON({
      accessToken,
      method: 'GET',
      path: 'healthz',
      typeGuard: (data): data is unknown => true,
    });
    return true;
  } catch {
    return false;
  }
}
