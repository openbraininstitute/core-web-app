import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { type TWorkspaceScope, WorkspaceScope } from '@/constants';

import type { WorkspaceContext } from '@/types/common';

export function usesProjectOwnership(dataType?: string) {
  return dataType === ExtendedEntitiesTypeDict.CellMorphology;
}

export const ProjectOwnership = {
  Current: 'This project',
  Other: 'Another project',
} as const;

export function getProjectOwnershipFilters(ownership: unknown, projectId?: string) {
  if (!projectId) return {};
  if (ownership === ProjectOwnership.Current) return { authorized_project_id: projectId };
  if (ownership === ProjectOwnership.Other) return { authorized_project_id__neq: projectId };
  return {};
}

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

/** Record-level form of {@link WorkspaceScope.Project}'s filter. */
export function isProjectPrivateRecord(
  record: { authorized_public: boolean; authorized_project_id: string },
  projectId?: string
): boolean {
  return !record.authorized_public && record.authorized_project_id === projectId;
}
