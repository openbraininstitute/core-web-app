import { useQueries, useSuspenseQuery } from '@tanstack/react-query';
import { find, groupBy } from 'es-toolkit/compat';

import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { getSelfVirtualLab, getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { UserGroup, VlmUserGroupsResponse } from '@/api/virtual-lab-svc/queries/types';

// waitlisted groups are named "proj/{virtual_lab_id}/{project_id}/waitlisted"
const isWaitlistedGroup = (group: UserGroup) => group.name.endsWith('/waitlisted');

export function makeRoles(
  data: VlmUserGroupsResponse | undefined,
  virtualLabId: string | undefined,
  projectId: string | undefined
) {
  const userGroups = data?.data?.groups;
  const groupedUserGroups = groupBy(userGroups, 'group_type');

  // if virtual lab id is provided, return whether the user is a member or admin of the virtual lab
  // if project id is provided (which requires virtual lab id too),
  // return whether the user is a member or admin of the project and virtual lab too
  const isVirtualLabMember = !!find(groupedUserGroups.vlab, { virtual_lab_id: virtualLabId });
  const isVirtualLabAdmin = !!find(groupedUserGroups.vlab, {
    virtual_lab_id: virtualLabId,
    role: 'admin',
  });
  const isProjectMember = !!find(
    groupedUserGroups.project,
    (group: UserGroup) => group.project_id === projectId && !isWaitlistedGroup(group)
  );
  const isProjectAdmin = !!find(
    groupedUserGroups.project,
    (group: UserGroup) =>
      group.project_id === projectId && group.role === 'admin' && !isWaitlistedGroup(group)
  );
  const isProjectWaitlisted = !!find(
    groupedUserGroups.project,
    (group: UserGroup) => group.project_id === projectId && isWaitlistedGroup(group)
  );
  return {
    userGroups,
    isVirtualLabMember,
    isVirtualLabAdmin,
    isProjectMember,
    isProjectAdmin,
    isProjectWaitlisted,
  };
}

type Props = {
  virtualLabId?: string;
  projectId?: string;
};

export function useWorkspaceMembership({ virtualLabId, projectId }: Props) {
  const [
    { data, isLoading: loadingGroups },
    { data: myVirtualLab, isLoading: loadingVirtualLab },
    { data: currentVirtualLab, isLoading: loadingCurrentVirtualLab },
    { data: currentProject, isLoading: loadingCurrentProject },
  ] = useQueries({
    queries: [
      {
        queryKey: keyBuilder.membership(),
        queryFn: getUserGroups,
      },
      {
        queryKey: keyBuilder.myLab(),
        queryFn: async () => await getSelfVirtualLab(),
      },
      {
        queryKey: keyBuilder.getOneLab({ virtualLabId: virtualLabId || '' }),
        queryFn: async () => await getVirtualLab({ id: virtualLabId! }),
        enabled: !!virtualLabId,
      },
      {
        queryKey: keyBuilder.getWorkspace({
          virtualLabId: virtualLabId || '',
          projectId: projectId || '',
          expand: ['admins'],
        }),
        queryFn: async () =>
          await getProject({
            virtualLabId: virtualLabId!,
            projectId: projectId!,
            expand: ['admins'],
          }),
        enabled: !!virtualLabId && !!projectId,
      },
    ],
  });

  const ownerVirtualLabId = myVirtualLab?.data?.id;
  const {
    userGroups,
    isVirtualLabMember,
    isVirtualLabAdmin,
    isProjectMember,
    isProjectAdmin,
    isProjectWaitlisted,
  } = makeRoles(data, virtualLabId, projectId);
  const isVirtualLabOwner = ownerVirtualLabId === virtualLabId;
  const virtualLabAdmins = currentVirtualLab?.admins;
  const virtualLabOwnerId = currentVirtualLab?.created_by;
  const projectAdmins = currentProject?.admins;
  const isLoading =
    loadingGroups || loadingVirtualLab || loadingCurrentVirtualLab || loadingCurrentProject;

  return {
    isLoading,
    userGroups,
    virtualLabAdmins,
    virtualLabOwnerId,
    projectAdmins,
    isVirtualLabMember,
    isVirtualLabAdmin,
    isVirtualLabOwner,
    isProjectMember,
    isProjectAdmin,
    isProjectWaitlisted,
  };
}

export function useSuspenseWorkspaceAccessControl({ virtualLabId, projectId }: Props) {
  const { data, error } = useSuspenseQuery({
    queryKey: keyBuilder.membership(),
    queryFn: getUserGroups,
    staleTime: Infinity,
  });

  const { userGroups, isVirtualLabMember, isVirtualLabAdmin, isProjectMember, isProjectAdmin } =
    makeRoles(data, virtualLabId, projectId);

  const hasWorkspaceAccess =
    isVirtualLabMember || isVirtualLabAdmin || isProjectMember || isProjectAdmin;

  return {
    error,
    userGroups,
    hasWorkspaceAccess,
  };
}
