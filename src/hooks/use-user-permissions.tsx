import { useActiveSubscription } from '@/hooks/use-active-subscription';
import { useUserRole } from '@/hooks/use-user-role';

type Props = {
  virtualLabId?: string;
  projectId?: string;
};

export function useUserPermissions({ virtualLabId, projectId }: Props) {
  const { data, forbiddenOperation, loading: subscriptionLoading } = useActiveSubscription();
  const {
    isVirtualLabAdmin,
    isVirtualLabMember,
    isProjectAdmin,
    isProjectMember,
    isLoading: userRoleLoading,
  } = useUserRole({
    virtualLabId,
    projectId,
  });

  return {
    loading: subscriptionLoading || userRoleLoading,
    subscription: data,
    isAllowedBySubscription: !forbiddenOperation,
    isVirtualLabAdmin,
    isProjectAdmin,
    isVirtualLabMember,
    isProjectMember,
  };
}

export default useUserPermissions;
