import { type TWorkspaceScope, WorkspaceScope } from '@/constants';

import type { WorkspaceContext } from '@/types/common';

export function getWorkspaceScopeFilters(scope: TWorkspaceScope, context?: WorkspaceContext) {
  const filters: Partial<Record<TWorkspaceScope, Record<string, unknown>>> = {
    [WorkspaceScope.Project]: {
      authorized_project_id: context?.projectId,
      authorized_public: false,
    },
    [WorkspaceScope.Public]: {
      authorized_public: true,
    },
    [WorkspaceScope.Combined]: {},
  };

  return filters[scope] ?? {};
}
