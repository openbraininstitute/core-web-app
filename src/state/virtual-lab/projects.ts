import { atom } from 'jotai';
import { atomFamily, atomWithRefresh, atomWithDefault } from 'jotai/utils';
import isEqual from 'lodash/isEqual';

import sessionAtom from '../session';
import { Project } from '@/types/virtual-lab/projects';
import { VirtualLabAPIListData } from '@/types/virtual-lab/common';
import {
  getProjectAccountBalance,
  getProjectJobReports,
  getUsersProjects,
  getVirtualLabProjectDetails,
  getVirtualLabProjectUsers,
  getVirtualLabProjects,
} from '@/services/virtual-lab/projects';
import { VirtualLabMember } from '@/types/virtual-lab/members';
import { retrievePapersListCount } from '@/services/paper-ai/retrievePapersList';
import { readAtomFamilyWithExpiration } from '@/util/atoms';
import { virtualLabBalanceRefreshTriggerAtom } from './lab';

export const virtualLabProjectsAtomFamily = atomFamily((virtualLabId: string) =>
  atomWithRefresh<Promise<VirtualLabAPIListData<Project> | undefined>>(async () => {
    const response = await getVirtualLabProjects(virtualLabId);
    return response.data;
  })
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
    atomWithRefresh<Promise<VirtualLabMember[] | null>>(async () => {
      if (!virtualLabId || !projectId) return null;
      const response = await getVirtualLabProjectUsers(virtualLabId, projectId);
      return response.data.users;
    }),
  isEqual
);

export const virtualLabProjectPapersCountAtomFamily = atomFamily(
  ({ virtualLabId, projectId }: { virtualLabId: string; projectId: string }) =>
    atomWithRefresh<Promise<number | undefined>>(async (get) => {
      const session = get(sessionAtom);
      if (!session) {
        return;
      }
      const response = await retrievePapersListCount({
        virtualLabId,
        projectId,
        accessToken: session.accessToken,
      });

      return response.total;
    }),
  isEqual
);

export const userProjectsAtom = atom<Promise<VirtualLabAPIListData<Project>>>(async () => {
  const response = await getUsersProjects();
  return response.data;
});

export const userProjectsTotalAtom = atom<Promise<number | undefined>>(async (get) => {
  const projects = await get(userProjectsAtom);
  return projects?.total || 0;
});

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
