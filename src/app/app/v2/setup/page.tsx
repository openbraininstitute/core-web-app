import { notFound, redirect, RedirectType } from 'next/navigation';
import { LoadingOutlined } from '@ant-design/icons';
import get from 'lodash/get';

import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { listProjects } from '@/api/virtual-lab-svc/queries/project';
import { V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { keyBuilder } from '@/ui/user-query-keys/workspace';
import { LabTypeEnum } from '@/api/virtual-lab-svc/types';
import { getQueryClient } from '@/query-provider/server';

import type { ServerSideComponentProp } from '@/types/common';
import type {
  VirtualLab,
  VirtualLabListResponse,
  VlmProjectsResponse,
} from '@/api/virtual-lab-svc/queries/types';

export default async function Page({
  searchParams,
}: ServerSideComponentProp<null, { redirectUrl: string | undefined }>) {
  const queryParams = await searchParams;

  const queryClient = getQueryClient();
  let isAlreadyHaveProject = false;
  let virtualLab: VirtualLab | null = null;
  let projectId: string | undefined;
  let shouldCreateProject = false;
  let virtualLabResult: VirtualLabListResponse | null = null;
  let projectResult: VlmProjectsResponse | null = null;

  try {
    virtualLabResult = await queryClient.fetchQuery({
      queryKey: keyBuilder.listAllLabs(),
      queryFn: () => listVirtualLabs({ include: [LabTypeEnum.MY_LAB] }),
    });

    if (virtualLabResult?.data?.virtual_lab?.id)
      throw new Error('The user already has a live virtual lab', {
        cause: {
          reason: 'VirtualLabAlreadyCreated',
          lab: virtualLabResult.data.virtual_lab,
        },
      });
  } catch (error) {
    if (get(error, 'cause.reason', null)) {
      virtualLab = get(error, 'cause.lab', {}) as VirtualLab;
      projectResult = await queryClient.fetchQuery({
        queryKey: keyBuilder.listWorkspaceProjects({ virtualLabId: virtualLab?.id! }),
        queryFn: () => listProjects({ virtualLabId: virtualLab?.id!, page: 1, size: 1 }),
      });

      projectId = projectResult?.data?.results.at(0)?.id;
      isAlreadyHaveProject = Boolean(projectResult?.data?.total);

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

  if (shouldCreateProject) {
    redirect(
      `${V2_MIGRATION_TEMPORARY_BASE_PATH}/setup/project?virtual-lab=${virtualLab?.id!}`,
      RedirectType.replace
    );
  } else if (!virtualLabResult?.data?.virtual_lab) {
    redirect(`${V2_MIGRATION_TEMPORARY_BASE_PATH}/setup/virtual-lab`, RedirectType.replace);
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <LoadingOutlined spin className="text-4xl" />
      <p className="text-neutral-4 text-sm">Checking for your setup...</p>
    </div>
  );
}
