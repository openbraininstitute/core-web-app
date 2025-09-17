import { Metadata } from 'next';

import { ProfileError } from '@/components/VirtualLab/create-entity-flows/profile/elements';
import { Profile } from '@/components/VirtualLab/create-entity-flows/profile/form';
import { getUserProfile } from '@/api/virtual-lab-svc/queries/user';
import { tryCatch } from '@/api/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { data: result, error } = await tryCatch(getUserProfile(), undefined, {
    section: 'profile-page',
    feature: 'get-user-profile',
  });
  if (error) {
    return {
      title: 'Profile',
      description: 'Manage your account information',
    };
  }
  return {
    title: `${result?.profile?.first_name} ${result?.profile?.last_name}`,
    description: 'Manage your account information',
  };
}

export default async function Page() {
  const { data: result, error } = await tryCatch(getUserProfile(), undefined, {
    section: 'profile-page',
    feature: 'get-user-profile',
  });
  if (error) {
    return <ProfileError />;
  }
  return <Profile data={result?.profile} />;
}
