import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';

import { getUserProfile } from '@/api/virtual-lab-svc/queries/user';
import { ErrorMinimal } from '@/ui/molecules/feedback-card';
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
    return (
      <ErrorMinimal
        title="Profile error"
        description="We were unable to fetch your profile information from our servers. Please refresh the page or try again later. if the issue persists, please contact support at support@openbraininstitute.org."
      />
    );
  }

  return <Profile data={data?.profile} />;
}
