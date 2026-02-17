export const LATEST_VISITED_PROJECT_KEY = 'latest-visited-project';
export const AUTO_INIT_WORKSPACE = 'automatic-init-workspace';
export const AUTO_ONBOARDING_TOURS = 'automatic-app-onboarding-tours';
export const LAST_REGISTERED_WORKFLOW = 'last-registered-workflow';

export const DEFAULT_CHECKLIST_RENDER_LENGTH = 8;
export const DEFAULT_PAGE_SIZE = 30;
export const DEFAULT_PAGE_MEDIUM_SIZE = 15;
export const DEFAULT_PAGE_SMALL_SIZE = 10;
export const DEFAULT_PAGE_XSMALL_SIZE = 5;
export const DEFAULT_PAGE_NUMBER = 1;

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
  process_data: 'process_data',
} as const;

export const WorkspaceSection = {
  Data: 'data',
  Notebooks: 'notebooks',
  BuildWorkflow: WorkflowActivityDictValue.build,
  SimulateWorkflow: WorkflowActivityDictValue.simulate,
  ExtractWorkflow: WorkflowActivityDictValue.extract,
} as const;

export type TWorkspaceSection = (typeof WorkspaceSection)[keyof typeof WorkspaceSection];
