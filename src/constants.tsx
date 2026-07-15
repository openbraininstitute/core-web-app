export const LATEST_VISITED_PROJECT_KEY = 'latest-visited-project';
export const AUTO_INIT_WORKSPACE = 'automatic-init-workspace';
export const AUTO_ONBOARDING_TOURS = 'automatic-app-onboarding-tours';
export const LAST_REGISTERED_WORKFLOW = 'last-registered-workflow';

/**
 * prefix marking a query param as cache-key-only: it is included in the React Query
 * key (e.g. to bust the cache when a prerequisite changes) but stripped before the
 * HTTP request so the backend never receives it
 */
export const INTERNAL_QUERY_CACHE_PREFIX = 'INTERNAL_QUERY_CACHE__';

export const DEFAULT_CHECKLIST_RENDER_LENGTH = 5;
export const DEFAULT_PAGE_SIZE = 30;
export const DEFAULT_PAGE_MEDIUM_SIZE = 15;
export const DEFAULT_PAGE_SMALL_SIZE = 10;
export const DEFAULT_PAGE_XSMALL_SIZE = 5;
export const DEFAULT_PAGE_NUMBER = 1;

/** Shared visual variant for detail views, mini detail views and related viewers. */
export const ViewVariant = {
  Light: 'light',
  Default: 'default',
} as const;

export type TViewVariant = (typeof ViewVariant)[keyof typeof ViewVariant];

export const WorkspaceScope = {
  Combined: 'combined', // this is for both public and project
  Public: 'public',
  Project: 'project',
  Bookmarks: 'bookmarks',
  Custom: 'custom',
  Build: 'build-model',
  Simulate: 'simulate-model',
  BuildSynaptomeModel: 'build-single-neuron-synaptome-model/memodel',
  BuildIonChannelModel: 'build-ion-channel-model',
} as const;

export type TWorkspaceScope = (typeof WorkspaceScope)[keyof typeof WorkspaceScope];

export const WorkflowActivityDictValue = {
  build: 'build',
  simulate: 'simulate',
  extract: 'extract',
  optimize: 'optimize',
  validate: 'validate',
  process: 'process',
} as const;

export const WorkspaceSection = {
  Data: 'data',
  Notebooks: 'notebooks',
  GeneralWorkflow: 'workflows',
  BuildWorkflow: WorkflowActivityDictValue.build,
  ScanConfigBuildWorkflow: 'scan-config-build-workflow',
  SimulateWorkflow: WorkflowActivityDictValue.simulate,
  ExtractWorkflow: WorkflowActivityDictValue.extract,
  ProcessWorkflow: WorkflowActivityDictValue.process,
} as const;

export type TWorkspaceSection = (typeof WorkspaceSection)[keyof typeof WorkspaceSection];

// use in data page to select the data group (models, experimental, simulations, notebooks, extractions, processing)
export const DATA_GROUP_QUERY_PARAM = 'group';
// use in data page to select the workspace scope (public, project)
export const SCOPE_QUERY_PARAMS = 'scope';
export const RECOVERABLE_SEAT_MAX_SPEND = 50;
