import { WorkspaceContext } from '@/types/common';

const prefix = 'workspace';

export const keyBuilder = {
  getOne: ({ virtualLabId, projectId }: WorkspaceContext) => [
    `${prefix}-project/${virtualLabId}/${projectId}`,
  ],
  listAllLabs: () => [`${prefix}-all`],
  listWithinVirtualLab: ({ virtualLabId }: { virtualLabId: string }) => [
    `${prefix}-projects-list/${virtualLabId}`,
  ],
  listVirtualLabTeam: ({ virtualLabId }: { virtualLabId: string }) => [
    `${prefix}-team/${virtualLabId}`,
  ],
  listProjectTeam: ({ virtualLabId, projectId }: WorkspaceContext) => [
    `${prefix}-project-team/${virtualLabId}/${projectId}`,
  ],
  roles: () => [`${prefix}/roles`],
  credits: ({
    virtualLabId,
    projectId,
    page,
    pageSize,
  }: WorkspaceContext & { page: number; pageSize: number }) => [
    `${prefix}}-project-credits/${virtualLabId}/${projectId}/${page}/${pageSize}`,
  ],
  wallet: ({ virtualLabId, projectId }: WorkspaceContext) => [
    `${prefix}-project-wallet/${virtualLabId}/${projectId}`,
  ],
};
