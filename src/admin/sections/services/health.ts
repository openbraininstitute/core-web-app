import { serviceBaseUrl } from './service-catalog';

import type { TServiceDescriptor } from './service-catalog';

export const ServiceStatus = {
  Up: 'up',
  Down: 'down',
  Unreachable: 'unreachable',
  Blocked: 'blocked',
  NotConfigured: 'not-configured',
} as const;

export type TServiceStatus = (typeof ServiceStatus)[keyof typeof ServiceStatus];

export type TServiceHealth = {
  status: TServiceStatus;
  httpStatus?: number;
  latencyMs?: number;
};

export type TServiceProbe = { health: TServiceHealth; version: string | null; path: string | null };

export type TProbeMode = {
  redirect: RequestRedirect;
  readStatus: (res: Response) => TServiceStatus;
};

export const BROWSER_PROBE: TProbeMode = {
  redirect: 'follow',
  readStatus: ({ ok }) => (ok ? ServiceStatus.Up : ServiceStatus.Down),
};

const PROBE_TIMEOUT_MS = 8000;

function probe(url: string, { redirect }: TProbeMode) {
  return fetch(url, { cache: 'no-store', redirect, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
}

async function fetchVersion(url: string, inData: boolean, mode: TProbeMode) {
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

async function probeHealth(url: string, mode: TProbeMode): Promise<TServiceHealth> {
  const started = performance.now();
  const res = await probe(url, mode).catch(() => null);
  const latencyMs = Math.round(performance.now() - started);
  if (!res) return { status: ServiceStatus.Unreachable, latencyMs };
  await res.body?.cancel();
  return { status: mode.readStatus(res), httpStatus: res.status, latencyMs };
}

export async function probeService(
  service: TServiceDescriptor,
  configuredUrl: string,
  mode: TProbeMode
): Promise<TServiceProbe> {
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
