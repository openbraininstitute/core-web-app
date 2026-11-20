import 'server-only';

import { probeService, ServiceStatus } from '@/admin/sections/services/health';
import { ProbedFrom, SERVICE_CATALOG } from '@/admin/sections/services/service-catalog';
import { serverConfig } from '@/config/server';

import type { TProbeMode, TServiceProbe } from '@/admin/sections/services/health';

/** True when the reply came from the gateway or the web app, not the service. */
export function isGatewayReply({ status, headers }: Response) {
  const isJson = headers.get('content-type')?.includes('json');
  return (status >= 300 && status < 400) || (!isJson && status < 500);
}

const SERVER_PROBE: TProbeMode = {
  redirect: 'manual',
  readStatus: (res) => {
    if (isGatewayReply(res) || res.status === 403) return ServiceStatus.Blocked;
    return res.ok ? ServiceStatus.Up : ServiceStatus.Down;
  },
};

export async function probeFromServer(key: string): Promise<TServiceProbe | null> {
  const service = SERVICE_CATALOG.find(
    (candidate) => candidate.key === key && candidate.probedFrom === ProbedFrom.Server
  );
  if (!service) return null;

  const configured = serverConfig[service.configKey];
  if (!configured) {
    return { health: { status: ServiceStatus.NotConfigured }, version: null, path: null };
  }

  return probeService(service, configured, SERVER_PROBE);
}
