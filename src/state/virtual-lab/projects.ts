import { atom } from 'jotai';
import { atomFamily, atomWithRefresh, atomWithDefault } from 'jotai/utils';
import isEqual from 'es-toolkit/compat/isEqual';

import { virtualLabBalanceRefreshTriggerAtom } from './lab';
import { Project } from '@/types/virtual-lab/projects';
import { VirtualLabAPIListData } from '@/types/virtual-lab/common';
import {
  getProjectAccountBalance,
  getProjectJobReports,
  getUsersProjects,
  getVirtualLabProjectDetails,
} from '@/services/virtual-lab/projects';
import { readAtomFamilyWithExpiration } from '@/util/atoms';
import { listProjectMembers } from '@/api/virtual-lab-svc/queries/member';
import {
  MembersResponse,
  VlmProjectsResponse,
  VlmProjectStatsResponse,
} from '@/api/virtual-lab-svc/queries/types';
import { listProjects } from '@/api/virtual-lab-svc/queries/project';
import { getProjectStats } from '@/api/virtual-lab-svc/queries/stats';
import { tryCatch } from '@/api/utils';

export const virtualLabProjectsAtomFamily = atomFamily(
  (params: { virtualLabId: string; page: number; size: number }) =>
    atomWithRefresh<Promise<VlmProjectsResponse | null>>(async () => {
      if (params.size === 0) return null;
      const response = await listProjects(params);
      return response;
    }),
  isEqual
);

export const virtualLabProjectDetailsAtomFamily = atomFamily(
  ({ virtualLabId, projectId }: { virtualLabId: string; projectId: string }) =>
    atomWithDefault<Promise<Project>>(async () => {
      const response = await getVirtualLabProjectDetails(virtualLabId, projectId);
      return response.data.project;
    }),
  isEqual
);

export const virtualLabProjectUsersAtomFamily = atomFamily(
  ({ virtualLabId, projectId }: { virtualLabId: string | null; projectId: string | null }) =>
    atomWithRefresh<Promise<MembersResponse | null>>(async () => {
      if (!virtualLabId || !projectId) return null;
      const response = await listProjectMembers({ virtualLabId, projectId });
      return response;
    }),
  isEqual
);

export const userProjectsAtom = atomWithRefresh<Promise<VirtualLabAPIListData<Project>>>(
  async () => {
    const response = await getUsersProjects();
    return response.data;
  }
);

export const projectJobReportsAtomFamily = readAtomFamilyWithExpiration(
  ({ virtualLabId, projectId, page }: { virtualLabId: string; projectId: string; page: number }) =>
    atom(() => getProjectJobReports({ virtualLabId, projectId, page })),
  {
    ttl: 10_000,
    areEqual: isEqual,
  }
);

export const projectBalanceAtomFamily = readAtomFamilyWithExpiration(
  ({ virtualLabId, projectId }: { virtualLabId: string; projectId: string }) =>
    atom(async (get) => {
      get(virtualLabBalanceRefreshTriggerAtom);

      return getProjectAccountBalance({ virtualLabId, projectId });
    }),
  { ttl: 20_000, areEqual: isEqual }
);

export const projectStatsAtomFamily = atomFamily(
  ({ virtualLabId, projectId }: { virtualLabId: string; projectId: string }) =>
    atomWithRefresh<Promise<VlmProjectStatsResponse | null>>(async () => {
      const { data } = await tryCatch(getProjectStats(virtualLabId, projectId), undefined, {
        section: 'project-stats-family',
        feature: 'get-project-stats',
      });
      return data;
    })
);
