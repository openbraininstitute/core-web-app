import useUserRole from '@/hooks/useUserRole';
import useActiveSubscription from '@/hooks/useActiveSubscription';

type Props = {
  virtualLabId?: string;
  projectId?: string;
};

export default function useUserPermissions({ virtualLabId, projectId }: Props) {
  const { data, forbiddenOperation } = useActiveSubscription();
  const { isAdmin, isMember, isProjectAdmin, isProjectMember } = useUserRole({
    virtualLabId,
    projectId,
  });

  return {
    subscription: data,
    isAllowedBySubscription: forbiddenOperation,
    isAdmin,
    isProjectAdmin,
    isMember,
    isProjectMember,
  };
}
