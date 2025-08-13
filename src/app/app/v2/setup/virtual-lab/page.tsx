import { RightOutlined } from '@ant-design/icons';
import { redirect } from 'next/navigation';

import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { VirtualLabSetup } from '@/ui/segments/app-onboarding/virtual-lab-step';
import { V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { keyBuilder } from '@/ui/user-query-keys/workspace';
import { getQueryClient } from '@/query-provider/server';
import { LabTypeEnum } from '@/api/virtual-lab-svc/types';

import type { VirtualLabListResponse } from '@/api/virtual-lab-svc/queries/types';

export default async function OnboardingFlowVirtualLabSetup() {
  const queryClient = getQueryClient();
  let error: string | null = null;
  let virtualLabResult: VirtualLabListResponse | null = null;

  try {
    virtualLabResult = await queryClient.fetchQuery({
      queryKey: keyBuilder.listAllLabs(),
      queryFn: () => listVirtualLabs({ include: [LabTypeEnum.MY_LAB] }),
    });
  } catch (err) {
    error = err instanceof Error ? err.message : 'An unknown error occurred';
  }

  if (virtualLabResult?.data?.virtual_lab?.id) {
    redirect(`${V2_MIGRATION_TEMPORARY_BASE_PATH}/setup/project`);
  }

  return (
    <div className="relative z-10 mx-auto flex h-screen w-screen flex-col items-center justify-center md:mt-0">
      <div className="text-neutral-2 mb-8 flex items-center justify-center gap-2">
        <span className="text-neutral-4">Account</span>
        <span>
          <RightOutlined className="text-sm" />
        </span>
        <span className="text-primary-9 font-bold">Virtual Lab</span>
        <RightOutlined className="text-sm" />
        <span className="text-neutral-4">Project</span>
      </div>
      <div className="flex items-center justify-center">
        <div className="scale-100 transform opacity-100 transition-all duration-500 ease-in-out">
          <VirtualLabSetup error={error} />
        </div>
      </div>
    </div>
  );
}
