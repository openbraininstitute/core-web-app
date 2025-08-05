import { notFound } from 'next/navigation';

import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { OnboardingFlow } from '@/ui/segments/sign-up-onboarding';
import { LabTypeEnum } from '@/api/virtual-lab-svc/types';
import { getQueryClient } from '@/query-provider/server';
import { keyBuilder } from '@/ui/queries/workspace';

export default async function Page() {
  const queryClient = getQueryClient();

  try {
    const result = await queryClient.fetchQuery({
      queryKey: keyBuilder.listAllLabs(),
      queryFn: () => listVirtualLabs({ include: [LabTypeEnum.MY_LAB] }),
    });
    if (result.data?.virtual_lab.id) throw new Error('The user already has a live virtual lab');
  } catch (error) {
    notFound();
  }

  return <OnboardingFlow />;
}
