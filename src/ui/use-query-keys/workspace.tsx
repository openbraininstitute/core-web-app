import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TGetVirtualLabExpandParam } from '@/api/virtual-lab-svc/queries/types';
import type { LabTypeEnum } from '@/api/virtual-lab-svc/types';
import type { WorkspaceContext } from '@/types/common';
import type { TGetProjectExpandParam } from '@/types/virtual-lab/projects';
import type { TActivityValue } from '@/ui/segments/workflows/config';

export const prefix = 'workspace';

export const keyBuilder = {
  /** Matches all `getWorkspace` variants for this lab/project (any `expand`). Use with `invalidateQueries`. */
  workspaceProject: ({ virtualLabId, projectId }: WorkspaceContext) =>
    [`${prefix}/project`, virtualLabId, projectId] as const,
  getWorkspace: ({
    virtualLabId,
    projectId,
    expand,
  }: WorkspaceContext & { expand?: readonly TGetProjectExpandParam[] }) =>
    [`${prefix}/project`, { virtualLabId, projectId, expand }] as const,
  getOneLab: ({
    virtualLabId,
    expand,
  }: {
    virtualLabId: string;
    expand?: Array<TGetVirtualLabExpandParam>;
  }) => [`${prefix}-lab`, { virtualLabId, expand }],
  /**
   * @deprecated
   */
  listAllLabs: ({ includes }: { includes?: Array<LabTypeEnum> }) => [`${prefix}/all`, { includes }],
  listTenantVirtualLabs: ({
    pagination,
    filters,
  }: Partial<{
    pagination?: { page: number; page_size: number };
    filters?: {
      scope?: 'all' | 'self' | 'external';
      admin_access_only?: boolean;
      order_by?: 'created_at' | 'updated_at' | 'name' | 'owner';
      order_direction?: 'asc' | 'desc';
      query?: string;
    };
  }>) => [`${prefix}/list-filtered-virtual-labs`, { pagination, filters }],
  myLab: () => [`${prefix}/me`],
  listWorkspaceProjects: ({
    virtualLabId,
    pagination,
    filter,
  }: {
    virtualLabId: string;
    pagination?: { page: number; page_size: number };
    filter?: {
      order_by?: 'created_at' | 'updated_at' | 'name' | 'owner';
      order_direction?: 'asc' | 'desc';
      query?: string;
    };
  }) => [`${prefix}/projects-list`, { virtualLabId, pagination, filter }],
  listVirtualLabTeam: ({ virtualLabId }: { virtualLabId: string }) => [
    `${prefix}/team`,
    { virtualLabId },
  ],
  listProjectTeam: ({ virtualLabId, projectId }: WorkspaceContext) => [
    `${prefix}/project-team`,
    { virtualLabId, projectId },
  ],
  membership: () => [`${prefix}/membership`],
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
    authorizedPublic,
  }: WorkspaceContext & {
    page?: number;
    pageSize?: number;
    entityType: TExtendedEntitiesTypeDict;
    selectionType?: TExtendedEntitiesTypeDict;
    activity: TActivityValue;
    authorizedPublic?: boolean;
  }) => [
    `${prefix}/activities`,
    {
      virtualLabId,
      projectId,
      page,
      pageSize,
      selectionType,
      entityType,
      activity,
      authorizedPublic,
    },
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
