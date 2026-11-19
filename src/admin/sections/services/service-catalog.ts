import type { PlatformApiUrlField, ServerConfig } from '@/config/schema';

type ServiceUrlField = Extract<keyof ServerConfig, `${string}_URL`>;

export type ServiceDescriptor = {
  key: string;
  label: string;
  description: string;
  healthPath: string;
  versionPath?: string;
  // auth-manager wraps its reply in `data`.
  versionInData?: boolean;
  // The config URL carries a version path, but health and version are mounted at the root.
  stripFromUrl?: string;
} & (
  | { probedFrom: 'browser'; configKey: PlatformApiUrlField }
  // Accounting and launch-system allow the web app's server by source IP, and grading and
  // cell-api send no CORS header.
  | { probedFrom: 'server'; configKey: ServiceUrlField }
);

export const SERVICE_CATALOG: ServiceDescriptor[] = [
  {
    key: 'entitycore',
    label: 'Entity Core',
    description: 'Entity data, assets and admin',
    probedFrom: 'browser',
    configKey: 'ENTITY_CORE_URL',
    healthPath: '/health',
    versionPath: '/version',
  },
  {
    key: 'virtual-lab',
    label: 'Virtual Lab API',
    description: 'Labs, projects and promotions',
    probedFrom: 'browser',
    configKey: 'VIRTUAL_LAB_API_URL',
    healthPath: '/health',
  },
  {
    key: 'ai-agent',
    label: 'AI Agent',
    description: 'Assistant and tools',
    probedFrom: 'browser',
    configKey: 'AI_AGENT_URL',
    healthPath: '/healthz',
    versionPath: '/version',
  },
  {
    key: 'obi-one',
    label: 'OBI One',
    description: 'Modeling workflows',
    probedFrom: 'browser',
    configKey: 'OBI_ONE_URL',
    healthPath: '/health',
    versionPath: '/version',
  },
  {
    key: 'small-scale-simulator',
    label: 'Small-scale Simulator',
    description: 'Bluenaas simulations. Its health route is a stub',
    probedFrom: 'browser',
    configKey: 'SMALL_SCALE_SIMULATOR_URL',
    healthPath: '/health',
  },
  {
    key: 'thumbnail',
    label: 'Thumbnail',
    description: 'Preview generation',
    probedFrom: 'browser',
    configKey: 'THUMBNAIL_API_URL',
    healthPath: '/health',
  },
  {
    key: 'notebook',
    label: 'Notebook',
    description: 'Notebook service',
    probedFrom: 'browser',
    configKey: 'NOTEBOOK_API_URL',
    healthPath: '/health',
  },
  {
    key: 'auth-manager',
    label: 'Auth Manager',
    description: 'Authorization service',
    probedFrom: 'browser',
    configKey: 'AUTH_MANAGER_URL',
    healthPath: '/health',
    versionPath: '/version',
    versionInData: true,
    stripFromUrl: '/v1',
  },
  {
    key: 'accounting',
    label: 'Accounting',
    description: 'Credits, jobs and prices',
    probedFrom: 'server',
    configKey: 'ACCOUNTING_URL',
    healthPath: '/health',
    versionPath: '/version',
  },
  {
    key: 'launch-system',
    label: 'Launch System',
    description: 'Jobs on cell A',
    probedFrom: 'server',
    configKey: 'LAUNCH_SYSTEM_URL',
    healthPath: '/health',
    versionPath: '/version',
  },
  {
    key: 'grading',
    label: 'Grading',
    description: 'Course assignment grading',
    probedFrom: 'server',
    configKey: 'GRADING_SERVICE_URL',
    healthPath: '/health',
  },
  {
    key: 'cell-api',
    label: 'Cell API',
    description: 'Circuit cell positions',
    probedFrom: 'server',
    configKey: 'CELL_API_URL',
    healthPath: '/health',
    versionPath: '/version',
  },
];

export function serviceBaseUrl(
  { stripFromUrl }: Pick<ServiceDescriptor, 'stripFromUrl'>,
  configuredUrl: string
) {
  const url = configuredUrl.replace(/\/+$/, '');
  return stripFromUrl && url.endsWith(stripFromUrl) ? url.slice(0, -stripFromUrl.length) : url;
}
