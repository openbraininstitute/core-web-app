import 'server-only';

import { fetchServiceVersion, probeServiceHealth } from '@/admin/sections/services/health';
import { SERVER_SERVICE_CATALOG, serviceBaseUrl } from '@/admin/sections/services/service-catalog';
import { serverConfig } from '@/config/server';

import type { ServiceProbe } from '@/admin/sections/services/health';

// Only services from the catalog, so a caller can't point the server at a URL of its choice.
export async function probeFromServer(key: string): Promise<ServiceProbe | null> {
  const service = SERVER_SERVICE_CATALOG.find((candidate) => candidate.key === key);
  if (!service) return null;

  const configured = serverConfig[service.configKey];
  if (!configured) return { health: { status: 'not-configured' }, version: null, path: null };

  const baseUrl = serviceBaseUrl(service, configured);
  const healthUrl = `${baseUrl}${service.healthPath}`;
  const [health, version] = await Promise.all([
    probeServiceHealth(healthUrl, true),
    service.versionPath
      ? fetchServiceVersion(`${baseUrl}${service.versionPath}`, { fromServer: true })
      : null,
  ]);

  return { health, version, path: new URL(healthUrl).pathname };
}
