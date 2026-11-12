// Health and version routes need no auth, so the operator's token stays out of these calls.

export type ServiceHealth = {
  status: 'up' | 'down' | 'unreachable';
  httpStatus?: number;
  latencyMs: number;
};

const PROBE_TIMEOUT_MS = 8000;

export async function fetchServiceVersion(
  baseUrl: string,
  versionPath: string
): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}${versionPath}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    // Top-level on most services; auth-manager nests it under `data`.
    const nested = (data.data ?? {}) as Record<string, unknown>;
    const version = data.app_version ?? data.version ?? nested.app_version ?? nested.version;
    return typeof version === 'string' ? version : null;
  } catch {
    return null;
  }
}

export async function probeServiceHealth({
  baseUrl,
  healthPath,
}: {
  baseUrl: string;
  healthPath: string;
}): Promise<ServiceHealth> {
  const started = performance.now();
  try {
    const res = await fetch(`${baseUrl}${healthPath}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const latencyMs = Math.round(performance.now() - started);
    return { status: res.ok ? 'up' : 'down', httpStatus: res.status, latencyMs };
  } catch {
    return { status: 'unreachable', latencyMs: Math.round(performance.now() - started) };
  }
}
