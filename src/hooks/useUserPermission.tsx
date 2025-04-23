import useUserRole from '@/hooks/useUserRole';
import useActiveSubscription from '@/hooks/useActiveSubscription';

type Props = {
  virtualLabId?: string;
  projectId?: string;
};

export default function useUserPermissions({ virtualLabId, projectId }: Props) {
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
