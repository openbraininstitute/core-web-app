import { serviceAiAgentUrl } from './url';
import { logError } from '@/util/logger';
import { createHeaders } from '@/util/utils';

interface QueryOptions<T> {
  accessToken?: string | null;
  method?: 'POST' | 'DELETE' | 'GET' | 'PATCH';
  path: string;
  query?: unknown;
  params?: Record<string, string | null>;
  typeGuard: (data: unknown) => data is T;
}

export async function fetchJSON<T>({
  accessToken = 'token-is-missing',
  method = 'POST',
  path,
  params = {},
  query = {},
  typeGuard,
}: QueryOptions<T>): Promise<T> {
  const url = serviceAiAgentUrl(path, params);
  try {
    const resp = await fetch(url, {
      method,
      headers: createHeaders(accessToken ?? 'token-is-missing', {
        'Content-Type': 'application/json',
      }),
      body: method === 'GET' ? undefined : JSON.stringify(query),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(`Query failed with error code #${resp.status}!`);
    }
    if (!typeGuard(data)) {
      logError('The following query failed because of an unexpected return type!');
      logError('', 'url:', url);
      logError('', 'method:', method);
      logError('', 'params:', params);
      logError('', 'output:', data);
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

type AsyncAction<T extends unknown[], R> = (...args: T) => Promise<R>;

/**
 * Transform a async function into a squashable one.
 * That means that if you call it but the previous call is still pending,
 * you will get the still pending promise and not execute it another time.
 * Useful for network calls you don't want to have in parallel.
 */
export function asyncCreateSquash<T extends unknown[], R>(
  action: AsyncAction<T, R>
): AsyncAction<T, R> {
  let currentAction: Promise<R> | null = null;

  return async (...args: T): Promise<R> => {
    if (currentAction) return currentAction;
    currentAction = action(...args);
    const result = await currentAction;
    currentAction = null;
    return result;
  };
}
