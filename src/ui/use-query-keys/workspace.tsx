import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/elements/helpers';
import type { WorkspaceContext } from '@/types/common';

export const prefix = 'workspace';

export const keyBuilder = {
  getOne: ({ virtualLabId, projectId }: WorkspaceContext) => [
    `${prefix}/project`,
    { virtualLabId, projectId },
  ],
  getOneLab: ({ virtualLabId }: { virtualLabId: string }) => [`${prefix}-lab`, { virtualLabId }],
  listAllLabs: () => [`${prefix}/all`],
  listWorkspaceProjects: ({ virtualLabId }: { virtualLabId: string }) => [
    `${prefix}/projects-list`,
    { virtualLabId },
  ],
  listVirtualLabTeam: ({ virtualLabId }: { virtualLabId: string }) => [
    `${prefix}/team`,
    { virtualLabId },
  ],
  listProjectTeam: ({ virtualLabId, projectId }: WorkspaceContext) => [
    `${prefix}/project-team`,
    { virtualLabId, projectId },
  ],
  roles: () => [`${prefix}/roles`],
  credits: ({
    virtualLabId,
    projectId,
    page,
    pageSize,
  }: WorkspaceContext & { page: number; pageSize: number }) => [
    `${prefix}}/project-credits`,
    { virtualLabId, projectId, page, pageSize },
  ],
  wallet: ({ virtualLabId, projectId }: WorkspaceContext) => [
    `${prefix}/project-wallet`,
    { virtualLabId, projectId },
  ],
  accounting: ({ virtualLabId }: { virtualLabId: string }) => [
    `${prefix}/virtual-lab-balance/${virtualLabId}`,
  ],
  metrics: ({ virtualLabId, projectId }: WorkspaceContext) => [
    `${prefix}/project-metrics`,
    { virtualLabId, projectId },
  ],
  purchases: ({
    virtualLabId,
    page,
    pageSize,
  }: {
    virtualLabId: string;
    page: number;
    pageSize: number;
  }) => [`${prefix}/virtual-lab-purchases`, { virtualLabId, page, pageSize }],
  activities: ({
    virtualLabId,
    projectId,
    entityType,
    activity,
    selectionType,
    page,
    pageSize,
  }: WorkspaceContext & {
    page?: number;
    pageSize?: number;
    entityType: TExtendedEntitiesTypeDict;
    selectionType?: TExtendedEntitiesTypeDict;
    activity: TActivityValue;
  }) => [
    `${prefix}/activities`,
    { virtualLabId, projectId, page, pageSize, selectionType, entityType, activity },
  ],
  bookmarkCategories: ({ virtualLabId, projectId }: WorkspaceContext) => [
    `${prefix}/bookmark-categories`,
    { virtualLabId, projectId },
  ],
  bookmarks: ({
    virtualLabId,
    projectId,
    category,
    page,
    pageSize,
  }: WorkspaceContext & {
    page?: number;
    pageSize?: number;
    category: TExtendedEntitiesTypeDict;
  }) => [`${prefix}/bookmark-categories`, { virtualLabId, projectId, category, page, pageSize }],
};
