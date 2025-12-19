import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getUserProfile } from '@/api/virtual-lab-svc/queries/user';
import { ProfileError } from '@/components/VirtualLab/create-entity-flows/profile/elements';
import { Profile } from '@/components/VirtualLab/create-entity-flows/profile/form';
import { keyBuilder } from '@/ui/use-query-keys/user';

export function UserProfile() {
  const { isLoading, data, isError } = useQuery({
    queryKey: keyBuilder.profile(),
    queryFn: getUserProfile,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (isLoading) {
    return <LoadingOutlined className="text-white" spin />;
  }

  if (isError) {
    return <ProfileError />;
  }

  return <Profile data={data?.profile} />;
}
