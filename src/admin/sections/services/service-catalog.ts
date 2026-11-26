import type { PlatformApiUrlField, ServerConfig } from '@/config/schema';

type TServiceUrlField = Extract<keyof ServerConfig, `${string}_URL`>;

export const ProbedFrom = { Browser: 'browser', Server: 'server' } as const;

export type TProbedFrom = (typeof ProbedFrom)[keyof typeof ProbedFrom];

export type TServiceDescriptor = {
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
  | { probedFrom: typeof ProbedFrom.Browser; configKey: PlatformApiUrlField }
  | { probedFrom: typeof ProbedFrom.Server; configKey: TServiceUrlField }
);

export const SERVICE_CATALOG: TServiceDescriptor[] = [
  {
    key: 'entitycore',
    label: 'Entity Core',
    description: 'Entity data, assets and admin',
    probedFrom: ProbedFrom.Browser,
    configKey: 'ENTITY_CORE_URL',
    healthPath: '/health',
    versionPath: '/version',
  },
  {
    key: 'virtual-lab',
    label: 'Virtual Lab API',
    description: 'Labs, projects and promotions',
    probedFrom: ProbedFrom.Browser,
    configKey: 'VIRTUAL_LAB_API_URL',
    healthPath: '/health',
  },
  {
    key: 'ai-agent',
    label: 'AI Agent',
    description: 'Assistant and tools',
    probedFrom: ProbedFrom.Browser,
    configKey: 'AI_AGENT_URL',
    healthPath: '/healthz',
    versionPath: '/version',
  },
  {
    key: 'obi-one',
    label: 'OBI One',
    description: 'Modeling workflows',
    probedFrom: ProbedFrom.Browser,
    configKey: 'OBI_ONE_URL',
    healthPath: '/health',
    versionPath: '/version',
  },
  {
    key: 'small-scale-simulator',
    label: 'Small-scale Simulator',
    description: 'Bluenaas simulations. Its health route is a stub',
    probedFrom: ProbedFrom.Browser,
    configKey: 'SMALL_SCALE_SIMULATOR_URL',
    healthPath: '/health',
  },
  {
    key: 'thumbnail',
    label: 'Thumbnail',
    description: 'Preview generation',
    probedFrom: ProbedFrom.Browser,
    configKey: 'THUMBNAIL_API_URL',
    healthPath: '/health',
  },
  {
    key: 'notebook',
    label: 'Notebook',
    description: 'Notebook service',
    probedFrom: ProbedFrom.Browser,
    configKey: 'NOTEBOOK_API_URL',
    healthPath: '/health',
  },
  {
    key: 'auth-manager',
    label: 'Auth Manager',
    description: 'Authorization service',
    probedFrom: ProbedFrom.Browser,
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
    probedFrom: ProbedFrom.Server,
    configKey: 'ACCOUNTING_URL',
    healthPath: '/health',
    versionPath: '/version',
  },
  {
    key: 'launch-system',
    label: 'Launch System',
    description: 'Jobs on cell A',
    probedFrom: ProbedFrom.Server,
    configKey: 'LAUNCH_SYSTEM_URL',
    healthPath: '/health',
    versionPath: '/version',
  },
  {
    key: 'grading',
    label: 'Grading',
    description: 'Course assignment grading',
    probedFrom: ProbedFrom.Server,
    configKey: 'GRADING_SERVICE_URL',
    healthPath: '/health',
  },
  {
    key: 'cell-api',
    label: 'Cell API',
    description: 'Circuit cell positions',
    probedFrom: ProbedFrom.Server,
    configKey: 'CELL_API_URL',
    healthPath: '/health',
    versionPath: '/version',
  },
];

export function serviceBaseUrl(
  { stripFromUrl }: Pick<TServiceDescriptor, 'stripFromUrl'>,
  configuredUrl: string
) {
  const url = configuredUrl.replace(/\/+$/, '');
  return stripFromUrl && url.endsWith(stripFromUrl) ? url.slice(0, -stripFromUrl.length) : url;
}
