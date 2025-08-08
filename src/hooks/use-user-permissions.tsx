import { useActiveSubscription } from '@/hooks/use-active-subscription';
import { useUserRole } from '@/hooks/use-user-role';

type Props = {
  virtualLabId?: string;
  projectId?: string;
};

export function useUserPermissions({ virtualLabId, projectId }: Props) {
  const { data, forbiddenOperation, loading: subscriptionLoading } = useActiveSubscription();
  const {
    isAdmin,
    isMember,
    isProjectAdmin,
    isProjectMember,
    loading: userRoleLoading,
  } = useUserRole({
    virtualLabId,
    projectId,
  });

  return {
    loading: subscriptionLoading || userRoleLoading,
    subscription: data,
    isAllowedBySubscription: !forbiddenOperation,
    isAdmin,
    isProjectAdmin,
    isMember,
    isProjectMember,
  };
}

export default useUserPermissions;
