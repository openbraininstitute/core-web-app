import { createHeaders } from '@/util/utils';

const URL = 'http://main-2110738358.us-east-1.elb.amazonaws.com/fastapi/';

export async function postJSON<T>(
  entryPoint: string,
  accessToken: string | undefined,
  query: unknown,
  typeGuard: (data: unknown) => data is T
): Promise<T> {
  return fetchJSON('POST', entryPoint, accessToken, query, typeGuard);
}

export async function deleteJSON<T>(
  entryPoint: string,
  accessToken: string | undefined,
  query: unknown,
  typeGuard: (data: unknown) => data is T
): Promise<T> {
  return fetchJSON('DELETE', entryPoint, accessToken, query, typeGuard);
}

async function fetchJSON<T>(
  method: 'POST' | 'DELETE',
  entryPoint: string,
  accessToken: string | undefined,
  query: unknown,
  typeGuard: (data: unknown) => data is T
): Promise<T> {
  const url = `${URL}${entryPoint}`;
  try {
    const resp = await fetch(url, {
      method,
      headers: createHeaders(accessToken ?? 'no-token', {
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(query),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(
        `Service return code: #${resp.status} (${resp.statusText})!\n${JSON.stringify(data, null, '  ')}`
      );
    }
    if (!typeGuard(data)) throw new Error('Response has not the expected type!');
    return data;
  } catch (ex) {
    throw new Error(`Entrypoint "${entryPoint}" failed for method ${method}!
Query: ${JSON.stringify(query, null, '  ')}

${ex}`);
  }
}
