import { env } from '@/env';

export const basePath = env.NEXT_PUBLIC_BASE_PATH;

export const isServer = typeof window === 'undefined';

export const accountingBaseUrl = env.NEXT_PUBLIC_ACCOUNTING_BASE_URL;

export const cellSvcBaseUrl = env.NEXT_PUBLIC_CELL_SVC_BASE_URL;
export const thumbnailGenerationBaseUrl = env.NEXT_PUBLIC_THUMBNAIL_GENERATION_BASE_URL;
export const entityCoreUrl = env.NEXT_PUBLIC_ENTITY_CORE_URL;
export const entityCorePublicVirtualLabId = env.NEXT_PUBLIC_ENTITY_CORE_PUBLIC_VIRTUAL_LAB_ID;
export const entityCorePublicProjectId = env.NEXT_PUBLIC_ENTITY_CORE_PUBLIC_PROJECT_ID;
export const notebookSvcBaseUrl = env.NEXT_PUBLIC_NOTEBOOK_SERVICE_BASE_URL;

export const smallScaleSimulatorUrl = env.NEXT_PUBLIC_SMALL_SCALE_SIMULATOR_URL;

export const autoSaveDebounceInterval = 10000;

export const virtualLabApi = {
  url: env.NEXT_PUBLIC_VIRTUAL_LAB_API_URL,
};

export const notebookRepoUrl =
  'https://github.com/openbraininstitute/obi_platform_analysis_notebooks';
