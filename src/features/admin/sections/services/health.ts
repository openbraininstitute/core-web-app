// Health and version routes need no auth, so the operator's token stays out of these calls.

export type ServiceHealth = {
  status: 'up' | 'down' | 'unreachable';
  httpStatus?: number;
  latencyMs: number;
};

const PROBE_TIMEOUT_MS = 8000;

function probe(url: string) {
  return fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
}

export async function fetchServiceVersion(url: string, inData = false): Promise<string | null> {
  try {
    const res = await probe(url);
    if (!res.ok) return null;
    const body = (await res.json()) as Record<string, unknown>;
    const source = (inData ? body.data : body) as Record<string, unknown> | undefined;
    const version = source?.app_version ?? source?.version;
    return typeof version === 'string' ? version : null;
  } catch {
    return null;
  }
}

export async function probeServiceHealth(url: string): Promise<ServiceHealth> {
  const started = performance.now();
  const res = await probe(url).catch(() => null);
  const latencyMs = Math.round(performance.now() - started);
  if (!res) return { status: 'unreachable', latencyMs };
  return { status: res.ok ? 'up' : 'down', httpStatus: res.status, latencyMs };
}
