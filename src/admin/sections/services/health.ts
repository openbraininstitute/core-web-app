import { serviceBaseUrl } from './service-catalog';

import type { ServiceDescriptor } from './service-catalog';

// Health and version routes need no auth, so the operator's token stays out of these calls.

export type ServiceHealth = {
  status: 'up' | 'down' | 'unreachable' | 'blocked' | 'not-configured';
  httpStatus?: number;
  latencyMs?: number;
};

export type ServiceProbe = { health: ServiceHealth; version: string | null; path: string | null };

export type ProbeMode = {
  redirect: RequestRedirect;
  readStatus: (res: Response) => ServiceHealth['status'];
};

export const BROWSER_PROBE: ProbeMode = {
  redirect: 'follow',
  readStatus: ({ ok }) => (ok ? 'up' : 'down'),
};

const PROBE_TIMEOUT_MS = 8000;

function probe(url: string, { redirect }: ProbeMode) {
  return fetch(url, { cache: 'no-store', redirect, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
}

async function fetchVersion(url: string, inData: boolean, mode: ProbeMode) {
  try {
    const res = await probe(url, mode);
    if (!res.ok) {
      await res.body?.cancel();
      return null;
    }
    const body = (await res.json()) as Record<string, unknown>;
    const source = (inData ? body.data : body) as Record<string, unknown> | undefined;
    const version = source?.app_version ?? source?.version;
    return typeof version === 'string' ? version : null;
  } catch {
    return null;
  }
}

async function probeHealth(url: string, mode: ProbeMode): Promise<ServiceHealth> {
  const started = performance.now();
  const res = await probe(url, mode).catch(() => null);
  const latencyMs = Math.round(performance.now() - started);
  if (!res) return { status: 'unreachable', latencyMs };
  await res.body?.cancel();
  return { status: mode.readStatus(res), httpStatus: res.status, latencyMs };
}

export async function probeService(
  service: ServiceDescriptor,
  configuredUrl: string,
  mode: ProbeMode
): Promise<ServiceProbe> {
  const baseUrl = serviceBaseUrl(service, configuredUrl);
  const healthUrl = `${baseUrl}${service.healthPath}`;
  const [health, version] = await Promise.all([
    probeHealth(healthUrl, mode),
    service.versionPath
      ? fetchVersion(`${baseUrl}${service.versionPath}`, !!service.versionInData, mode)
      : null,
  ]);
  return { health, version, path: new URL(healthUrl, 'http://localhost').pathname };
}
