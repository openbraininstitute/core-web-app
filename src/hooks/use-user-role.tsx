import { useQueries } from '@tanstack/react-query';
import { find, groupBy } from 'es-toolkit/compat';
import { getProject } from '@/api/virtual-lab-svc/queries/project';
import type { VlmUserGroupsResponse } from '@/api/virtual-lab-svc/queries/types';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { getVirtualLab, listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { LabTypeEnum } from '@/api/virtual-lab-svc/types';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

type Props = {
  virtualLabId?: string;
  projectId?: string;
};

export function useUserRole({ virtualLabId, projectId }: Props) {
  const [
    { data, isLoading: loadingGroups },
    { data: myVirtualLab, isLoading: loadingVirtualLab },
    { data: currentVirtualLab, isLoading: loadingCurrentVirtualLab },
    { data: currentProject, isLoading: loadingCurrentProject },
  ] = useQueries({
    queries: [
      {
        queryKey: keyBuilder.roles(),
        queryFn: getUserGroups,
      },
      {
        queryKey: keyBuilder.listAllLabs({ includes: [LabTypeEnum.MY_LAB] }),
        queryFn: async () => await listVirtualLabs({ include: [LabTypeEnum.MY_LAB] }),
      },
      {
        queryKey: keyBuilder.getOneLab({ virtualLabId: virtualLabId || '' }),
        queryFn: async () => await getVirtualLab(virtualLabId!),
        enabled: !!virtualLabId,
      },
      {
        queryKey: keyBuilder.getWorkspace({
          virtualLabId: virtualLabId || '',
          projectId: projectId || '',
        }),
        queryFn: async () =>
          await getProject({ virtualLabId: virtualLabId!, projectId: projectId! }),
        enabled: !!virtualLabId && !!projectId,
      },
    ],
  });
  const ownerVirtualLabId = myVirtualLab?.data?.virtual_lab.id;
  const { userGroups, isVirtualLabMember, isVirtualLabAdmin, isProjectMember, isProjectAdmin } =
    makeRoles(data, virtualLabId, projectId);
  const isVirtualLabOwner = ownerVirtualLabId === virtualLabId;
  const virtualLabAdmins = currentVirtualLab?.data?.admins;
  const projectAdmins = currentProject?.data.project.admins;
  const isLoading =
    loadingGroups || loadingVirtualLab || loadingCurrentVirtualLab || loadingCurrentProject;

  return {
    isLoading,
    userGroups,
    virtualLabAdmins,
    projectAdmins,
    isVirtualLabMember,
    isVirtualLabAdmin,
    isVirtualLabOwner,
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
  const isVirtualLabMember = !!find(groupedUserGroups.vlab, { virtual_lab_id: virtualLabId });
  const isVirtualLabAdmin = !!find(groupedUserGroups.vlab, {
    virtual_lab_id: virtualLabId,
    role: 'admin',
  });
  const isProjectMember = !!find(groupedUserGroups.project, { project_id: projectId });
  const isProjectAdmin = !!find(groupedUserGroups.project, {
    project_id: projectId,
    role: 'admin',
  });
  return {
    userGroups,
    isVirtualLabMember,
    isVirtualLabAdmin,
    isProjectMember,
    isProjectAdmin,
  };
}
