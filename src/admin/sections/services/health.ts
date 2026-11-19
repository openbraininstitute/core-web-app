// Health and version routes need no auth, so the operator's token stays out of these calls.

export type ServiceHealth = {
  status: 'up' | 'down' | 'unreachable' | 'blocked' | 'not-configured';
  httpStatus?: number;
  latencyMs?: number;
};

export type ServiceProbe = { health: ServiceHealth; version: string | null; path: string | null };

const PROBE_TIMEOUT_MS = 8000;

// From the server a redirect isn't followed: the gateway answers a source it refuses with one to
// the main site, which would read as healthy.
function probe(url: string, fromServer: boolean) {
  return fetch(url, {
    cache: 'no-store',
    redirect: fromServer ? 'manual' : 'follow',
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });
}

// The services probed from the server answer health with JSON and need no auth on it, so a
// redirect, a 403 or another body came from the gateway or the web app, not the service.
export function serverReplyStatus({ ok, status, headers }: Response): ServiceHealth['status'] {
  const isJson = headers.get('content-type')?.includes('json');
  if ((status >= 300 && status < 400) || status === 403 || !isJson) return 'blocked';
  return ok ? 'up' : 'down';
}

export async function fetchServiceVersion(
  url: string,
  { inData = false, fromServer = false } = {}
): Promise<string | null> {
  try {
    const res = await probe(url, fromServer);
    if (!res.ok) return null;
    const body = (await res.json()) as Record<string, unknown>;
    const source = (inData ? body.data : body) as Record<string, unknown> | undefined;
    const version = source?.app_version ?? source?.version;
    return typeof version === 'string' ? version : null;
  } catch {
    return null;
  }
}

export async function probeServiceHealth(url: string, fromServer = false): Promise<ServiceHealth> {
  const started = performance.now();
  const res = await probe(url, fromServer).catch(() => null);
  const latencyMs = Math.round(performance.now() - started);
  if (!res) return { status: 'unreachable', latencyMs };
  if (fromServer) return { status: serverReplyStatus(res), httpStatus: res.status, latencyMs };
  return { status: res.ok ? 'up' : 'down', httpStatus: res.status, latencyMs };
}
