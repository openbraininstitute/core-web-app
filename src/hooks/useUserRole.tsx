import { useEffect, useState } from 'react';
import groupBy from 'lodash/groupBy';
import find from 'lodash/find';

import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { UserGroup } from '@/api/virtual-lab-svc/queries/types';
import { tryCatch } from '@/api/utils';

type Props = {
  virtualLabId?: string;
  projectId?: string;
};

export default function useUserRole({ virtualLabId, projectId }: Props) {
  const [userGroups, setUserGroups] = useState<Array<UserGroup>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchUserGroups() {
      setLoading(true);
      const { data: result } = await tryCatch(
        getUserGroups(),
        () => {
          setLoading(false);
        },
        {
          feature: 'get-user-groups',
          section: 'useUserRole',
        }
      );
      if (result?.data) setUserGroups(result.data.groups);
      else setUserGroups([]);
    }
    fetchUserGroups();
  }, [virtualLabId, projectId]);

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

  return {
    loading,
    userGroups,
    isMember,
    isAdmin,
    isProjectMember,
    isProjectAdmin,
  };
}
