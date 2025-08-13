import { RightOutlined } from '@ant-design/icons';
import { redirect } from 'next/navigation';

import { createProject, listProjects } from '@/api/virtual-lab-svc/queries/project';
import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { randomProjectName } from '@/utils/generate-random-project';
import { ProjectSetup } from '@/ui/segments/app-setup/project-step';
import { V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { keyBuilder } from '@/ui/user-query-keys/workspace';
import { getQueryClient } from '@/query-provider/server';
import { LabTypeEnum } from '@/api/virtual-lab-svc/types';

import type { ServerSideComponentProp } from '@/types/common';
import type {
  ProjectCreationResponse,
  VirtualLabListResponse,
  VlmProjectsResponse,
} from '@/api/virtual-lab-svc/queries/types';

export default async function OnboardingFlowProjectSetup({
  searchParams,
}: ServerSideComponentProp<null, { id: string; name: string }>) {
  const { id, name } = await searchParams;
  const queryClient = getQueryClient();

  let virtualLabResult: VirtualLabListResponse | null = null;
  let createProjectResult: ProjectCreationResponse | null = null;
  let doCreateProject = false;
  let error: string | null = null;

  try {
    try {
      virtualLabResult = await queryClient.fetchQuery({
        queryKey: keyBuilder.listAllLabs(),
        queryFn: () => listVirtualLabs({ include: [LabTypeEnum.MY_LAB] }),
      });
    } catch {
      throw new Error(
        'Failed to retrieve your virtual lab. This might be due to a temporary server issue or network connectivity problems. Please try refreshing the page or contact support if the issue persists.'
      );
    }

    if (virtualLabResult?.data?.virtual_lab?.id) {
      let projectResult: VlmProjectsResponse | null = null;
      try {
        projectResult = await queryClient.fetchQuery({
          queryKey: keyBuilder.listWorkspaceProjects({
            virtualLabId: virtualLabResult.data?.virtual_lab?.id ?? id,
          }),
          queryFn: () =>
            listProjects({
              virtualLabId: virtualLabResult?.data?.virtual_lab?.id ?? id,
              page: 1,
              size: 1,
            }),
        });
      } catch {
        throw new Error(
          'Failed to retrieve existing projects for your virtual lab. This might be due to a temporary server issue or network connectivity problems. Please try refreshing the page or contact support if the issue persists.'
        );
      }

      if (projectResult?.data?.total) {
        const myProject = projectResult.data.results.find(
          (p) => p.virtual_lab_id === virtualLabResult?.data?.virtual_lab?.id
        );

        // NOTE: user already have a project for his own virtual lab
        // redirect him to the workspace

        if (myProject) {
          redirect(
            `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${myProject.virtual_lab_id}/${myProject.id}`
          );
        } else {
          // NOTE: user already have virtual lab but no project has been created
          doCreateProject = true;
        }
      } else {
        // NOTE: user do not have a project
        // create a new fresh project
        doCreateProject = true;
      }
    } else {
      redirect(`${V2_MIGRATION_TEMPORARY_BASE_PATH}/setup`);
    }

    if (doCreateProject) {
      try {
        createProjectResult = await queryClient.fetchQuery({
          queryKey: [
            'create-project-server-side',
            { id: virtualLabResult?.data?.virtual_lab?.id ?? id },
          ],
          queryFn: () =>
            createProject(virtualLabResult?.data?.virtual_lab?.id ?? id, {
              name: randomProjectName(),
              description: 'first project created by the platform',
              include_members: [],
            }),
        });
      } catch {
        throw new Error(
          'Failed to create your project. This might be due to a temporary server issue or network connectivity problems. Please try refreshing the page or contact support if the issue persists.'
        );
      }
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'An unknown error occurred';
  }

  return (
    <div className="relative z-10 mx-auto flex h-screen w-screen flex-col items-center justify-center md:mt-0">
      <div className="text-neutral-2 mb-8 flex items-center justify-center gap-2">
        <span className="text-neutral-4">Account</span>
        <span>
          <RightOutlined className="text-sm" />
        </span>
        <span className="text-neutral-4">Virtual Lab</span>
        <RightOutlined className="text-sm" />
        <span className="text-primary-9 font-bold">Project</span>
      </div>

      <div className="flex items-center justify-center">
        <div className="scale-100 transform opacity-100 transition-all duration-500 ease-in-out">
          <ProjectSetup
            virtualLabId={id}
            virtualLabName={name}
            projectId={createProjectResult?.data?.project.id}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
