import type { PlatformApiUrlField } from '@/config/schema';

// Services a browser can probe through the public gateway. Accounting and launch-system are
// blocked by source IP, and grading and cell-api send no CORS header, so those need a
// server-side probe.

export type ServiceDescriptor = {
  key: string;
  label: string;
  description: string;
  configKey: PlatformApiUrlField;
  healthPath: string;
  versionPath?: string;
  // auth-manager wraps its reply in `data`.
  versionInData?: boolean;
  // The config URL carries a version path, but health and version are mounted at the root.
  stripFromUrl?: string;
};

export const SERVICE_CATALOG: ServiceDescriptor[] = [
  {
    key: 'entitycore',
    label: 'Entity Core',
    description: 'Entity data, assets and admin',
    configKey: 'ENTITY_CORE_URL',
    healthPath: '/health',
    versionPath: '/version',
  },
  {
    key: 'virtual-lab',
    label: 'Virtual Lab API',
    description: 'Labs, projects and promotions',
    configKey: 'VIRTUAL_LAB_API_URL',
    healthPath: '/health',
  },
  {
    key: 'ai-agent',
    label: 'AI Agent',
    description: 'Assistant and tools',
    configKey: 'AI_AGENT_URL',
    healthPath: '/healthz',
    versionPath: '/version',
  },
  {
    key: 'obi-one',
    label: 'OBI One',
    description: 'Modeling workflows',
    configKey: 'OBI_ONE_URL',
    healthPath: '/health',
    versionPath: '/version',
  },
  {
    key: 'small-scale-simulator',
    label: 'Small-scale Simulator',
    description: 'Bluenaas simulations. Its health route is a stub',
    configKey: 'SMALL_SCALE_SIMULATOR_URL',
    healthPath: '/health',
  },
  {
    key: 'thumbnail',
    label: 'Thumbnail',
    description: 'Preview generation',
    configKey: 'THUMBNAIL_API_URL',
    healthPath: '/health',
  },
  {
    key: 'notebook',
    label: 'Notebook',
    description: 'Notebook service',
    configKey: 'NOTEBOOK_API_URL',
    healthPath: '/health',
  },
  {
    key: 'auth-manager',
    label: 'Auth Manager',
    description: 'Authorization service',
    configKey: 'AUTH_MANAGER_URL',
    healthPath: '/health',
    versionPath: '/version',
    versionInData: true,
    stripFromUrl: '/v1',
  },
];

export function serviceBaseUrl(
  { stripFromUrl }: Pick<ServiceDescriptor, 'stripFromUrl'>,
  configuredUrl: string
) {
  const url = configuredUrl.replace(/\/+$/, '');
  return stripFromUrl && url.endsWith(stripFromUrl) ? url.slice(0, -stripFromUrl.length) : url;
}
