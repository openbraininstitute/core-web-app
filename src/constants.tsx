export const LATEST_VISITED_PROJECT_KEY = 'latest-visited-project';
export const AUTO_INIT_WORKSPACE = 'automatic-init-workspace';
export const AUTO_ONBOARDING_DONE = 'automatic-app-onboarding';

export const DEFAULT_CHECKLIST_RENDER_LENGTH = 8;
export const DEFAULT_PAGE_SIZE = 30;
export const DEFAULT_PAGE_NUMBER = 1;

export const WorkspaceScope = {
  Public: 'public',
  Project: 'project',
  Bookmarks: 'bookmarks',
  Custom: 'custom',
  BuildMeModel: 'build-me-model',
} as const;

export type TWorkspaceScope = (typeof WorkspaceScope)[keyof typeof WorkspaceScope];
