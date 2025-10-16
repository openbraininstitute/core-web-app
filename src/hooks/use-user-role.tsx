import { useQueries } from '@tanstack/react-query';
import { groupBy, find } from 'es-toolkit/compat';

import { VlmUserGroupsResponse } from '@/api/virtual-lab-svc/queries/types';
import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { LabTypeEnum } from '@/api/virtual-lab-svc/types';

type Props = {
  virtualLabId?: string;
  projectId?: string;
};

export function useUserRole({ virtualLabId, projectId }: Props) {
  const [{ data, isLoading: loadingGroups }, { data: myVirtualLab, isLoading: loadingVirtualLab }] =
    useQueries({
      queries: [
        {
          queryKey: keyBuilder.roles(),
          queryFn: getUserGroups,
        },
        {
          queryKey: keyBuilder.listAllLabs({ includes: [LabTypeEnum.MY_LAB] }),
          queryFn: async () => await listVirtualLabs({ include: [LabTypeEnum.MY_LAB] }),
        },
      ],
    });
  const ownerVirtualLabId = myVirtualLab?.data?.virtual_lab.id;
  const { userGroups, isMember, isAdmin, isProjectMember, isProjectAdmin } = makeRoles(
    data,
    virtualLabId,
    projectId
  );
  const isOwner = ownerVirtualLabId === virtualLabId;

  return {
    loading: loadingGroups || loadingVirtualLab,
    userGroups,
    isMember,
    isAdmin,
    isOwner,
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
