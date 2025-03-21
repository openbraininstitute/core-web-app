import { serviceAiAgentUrl } from './url';
import { logError } from '@/util/logger';
import { createHeaders } from '@/util/utils';

interface QueryOptions<T> {
  accessToken?: string | null;
  method?: 'POST' | 'DELETE' | 'GET';
  path: string;
  query?: unknown;
  typeGuard: (data: unknown) => data is T;
}

export async function fetchJSON<T>({
  accessToken = 'token-is-missing',
  method = 'POST',
  path,
  query = {},
  typeGuard,
}: QueryOptions<T>): Promise<T> {
  const url = serviceAiAgentUrl(path);
  try {
    const resp = await fetch(url, {
      method,
      headers: createHeaders(accessToken ?? 'token-is-missing', {
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(query),
    });
    const data = await resp.json();
    if (!resp.ok) {
      logError(`Error #${resp.status}`);
      logError('URL:', url);
      logError('Query:', query);
      logError(`Output:`, data);
      throw new Error(`Query failed with error code #${resp.status}!`);
    }
    if (!typeGuard(data)) {
      throw new Error('Unexpected return type!');
    }
    return data;
  } catch (ex) {
    throw new Error(`Query failed for url "${url}"!\n${ex}`);
  }
}

/**
 * Use this type guard only when you want to ignore a return type.
 */
export function isVoidType(data: unknown): data is void {
  return true;
}
