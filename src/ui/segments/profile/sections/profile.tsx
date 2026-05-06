import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';

import { getUserProfile } from '@/api/virtual-lab-svc/queries/user';
import { ProfileError } from '@/ui/segments/profile/sections/profile-form/elements';
import { Profile } from '@/ui/segments/profile/sections/profile-form/form';
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
