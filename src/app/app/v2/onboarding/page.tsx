import { notFound, redirect } from 'next/navigation';
import get from 'lodash/get';

import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { listProjects } from '@/api/virtual-lab-svc/queries/project';
import { OnboardingFlow } from '@/ui/segments/app-onboarding';
import { V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { keyBuilder } from '@/ui/user-query-keys/workspace';
import { LabTypeEnum } from '@/api/virtual-lab-svc/types';
import { getQueryClient } from '@/query-provider/server';

import type { VirtualLab } from '@/api/virtual-lab-svc/queries/types';
import type { ServerSideComponentProp } from '@/types/common';

export default async function Page({
  searchParams,
}: ServerSideComponentProp<null, { redirectUrl: string | undefined }>) {
  const queryParams = await searchParams;

  const queryClient = getQueryClient();
  let isAlreadyHaveProject = false;
  let virtualLab: VirtualLab | null = null;
  let projectId: string | undefined;
  let shouldCreateProject = false;

  try {
    const result = await queryClient.fetchQuery({
      queryKey: keyBuilder.listAllLabs(),
      queryFn: () => listVirtualLabs({ include: [LabTypeEnum.MY_LAB] }),
    });
    if (result.data?.virtual_lab?.id)
      throw new Error('The user already has a live virtual lab', {
        cause: {
          reason: 'VirtualLabAlreadyCreated',
          lab: result.data.virtual_lab,
        },
      });
  } catch (error) {
    if (get(error, 'cause.reason', null)) {
      virtualLab = get(error, 'cause.lab', {}) as VirtualLab;
      const result = await queryClient.fetchQuery({
        queryKey: keyBuilder.listWorkspaceProjects({ virtualLabId: virtualLab?.id! }),
        queryFn: () => listProjects({ virtualLabId: virtualLab?.id!, page: 1, size: 1 }),
      });

      projectId = result.data?.results.at(0)?.id;
      isAlreadyHaveProject = Boolean(result.data?.total);

      if (isAlreadyHaveProject) {
        if (queryParams.redirectUrl) {
          redirect(queryParams.redirectUrl);
        } else {
          redirect(`${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLab?.id}/${projectId}`);
        }
      } else {
        shouldCreateProject = true;
      }
    } else {
      notFound();
    }
  }

  return (
    <OnboardingFlow
      flowStep={shouldCreateProject ? 'project' : 'virtual-lab'}
      meta={
        shouldCreateProject
          ? {
              virtualLabId: virtualLab?.id!,
              virtualLabName: virtualLab?.name!,
            }
          : null
      }
    />
  );
}
