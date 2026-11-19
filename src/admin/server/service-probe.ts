import 'server-only';

import { probeService } from '@/admin/sections/services/health';
import { SERVICE_CATALOG } from '@/admin/sections/services/service-catalog';
import { serverConfig } from '@/config/server';

import type { ProbeMode, ServiceProbe } from '@/admin/sections/services/health';

// The gateway answers a source it refuses with a redirect to the main site, and these services
// always answer JSON, so a redirect or another body came from the gateway or the web app. A 5xx
// page is the gateway saying the service is down, though.
export function isGatewayReply({ status, headers }: Response) {
  const isJson = headers.get('content-type')?.includes('json');
  return (status >= 300 && status < 400) || (!isJson && status < 500);
}

// A redirect isn't followed, so it can't read as healthy. Health needs no auth, so a 403 is the
// gateway's too.
const SERVER_PROBE: ProbeMode = {
  redirect: 'manual',
  readStatus: (res) => {
    if (isGatewayReply(res) || res.status === 403) return 'blocked';
    return res.ok ? 'up' : 'down';
  },
};

// Only services from the catalog, so a caller can't point the server at a URL of its choice.
export async function probeFromServer(key: string): Promise<ServiceProbe | null> {
  const service = SERVICE_CATALOG.find(
    (candidate) => candidate.key === key && candidate.probedFrom === 'server'
  );
  if (!service) return null;

  const configured = serverConfig[service.configKey];
  if (!configured) return { health: { status: 'not-configured' }, version: null, path: null };

  return probeService(service, configured, SERVER_PROBE);
}
