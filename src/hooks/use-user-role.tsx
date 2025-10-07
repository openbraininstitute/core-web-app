import { useQuery } from '@tanstack/react-query';
import groupBy from 'es-toolkit/compat/groupBy';
import find from 'es-toolkit/compat/find';

import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { VlmUserGroupsResponse } from '@/api/virtual-lab-svc/queries/types';

type Props = {
  virtualLabId?: string;
  projectId?: string;
};

export function useUserRole({ virtualLabId, projectId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: keyBuilder.roles(),
    queryFn: getUserGroups,
  });

  const { userGroups, isMember, isAdmin, isProjectMember, isProjectAdmin } = makeRoles(
    data,
    virtualLabId,
    projectId
  );

  return {
    loading: isLoading,
    userGroups,
    isMember,
    isAdmin,
    isProjectMember,
    isProjectAdmin,
  };
}

export default useUserRole;

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
  const isMember = !!find(groupedUserGroups.vlab, { virtual_lab_id: virtualLabId });
  const isAdmin = !!find(groupedUserGroups.vlab, { virtual_lab_id: virtualLabId, role: 'admin' });
  const isProjectMember = !!find(groupedUserGroups.project, { project_id: projectId });
  const isProjectAdmin = !!find(groupedUserGroups.project, {
    project_id: projectId,
    role: 'admin',
  });
  return { userGroups, isMember, isAdmin, isProjectMember, isProjectAdmin };
}
