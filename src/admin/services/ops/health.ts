import { authFetchWithoutRetry } from '@/auth-fetch';

export type ServiceHealth = {
  status: 'operational' | 'unreachable';
  httpStatus?: number;
  latencyMs: number;
  version?: string;
};

const PROBE_TIMEOUT_MS = 8000;

async function fetchServiceVersion(baseUrl: string): Promise<string | undefined> {
  try {
    const res = await authFetchWithoutRetry(`${baseUrl}/version`, {
      method: 'GET',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as Record<string, unknown>;
    // Top-level on most services; auth-manager nests it under `data`.
    const nested = (data.data ?? {}) as Record<string, unknown>;
    const version = data.app_version ?? data.version ?? nested.app_version ?? nested.version;
    return typeof version === 'string' ? version : undefined;
  } catch {
    return undefined;
  }
}

export async function probeServiceHealth({
  baseUrl,
  healthPath,
  supportsVersion,
}: {
  baseUrl: string;
  healthPath: string;
  supportsVersion: boolean;
}): Promise<ServiceHealth> {
  const started = performance.now();
  try {
    const res = await authFetchWithoutRetry(`${baseUrl}${healthPath}`, {
      method: 'GET',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const latencyMs = Math.round(performance.now() - started);
    if (!res.ok) {
      return { status: 'unreachable', httpStatus: res.status, latencyMs };
    }
    const version = supportsVersion ? await fetchServiceVersion(baseUrl) : undefined;
    return { status: 'operational', httpStatus: res.status, latencyMs, version };
  } catch {
    return { status: 'unreachable', latencyMs: Math.round(performance.now() - started) };
  }
}
