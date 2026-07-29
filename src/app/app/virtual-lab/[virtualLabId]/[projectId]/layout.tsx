import { RedirectType, redirect } from 'next/navigation';

import { getBrainAtlases } from '@/api/entitycore/queries/general/brain-atlas';
import {
  getBrainRegionHierarchiesWithSpecies,
  getBrainRegionHierarchy,
} from '@/api/entitycore/queries/general/brain-region';
import { tryCatch } from '@/api/utils';
import { activateEnrolment } from '@/api/virtual-lab-svc/queries/course';
import { getProject } from '@/api/virtual-lab-svc/queries/project';
import {
  getUserGroups,
  getWorkspaceHierarchySpeciesPreference,
} from '@/api/virtual-lab-svc/queries/user';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { config } from '@/config';
import { getQueryClient } from '@/query-provider/server';
import { ProjectRootLayout } from '@/ui/layouts/project-root-layout';
import { Container as AiContainer } from '@/ui/segments/ai/container';
import { SpaceManagerContainer } from '@/ui/segments/workspaces/space-manager';
import { WorkspaceTopMenu } from '@/ui/segments/workspaces/top-menu';
import { keyBuilderAtlas, keyBuilderHierarchy } from '@/ui/use-query-keys/atlas';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  params: Promise<{ virtualLabId: string; projectId: string }>;
};

export default async function Layout({ children, params: promisedParams }: Props) {
  const { virtualLabId, projectId } = await promisedParams;
  const queryClient = getQueryClient();

  const { data, error } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
      queryFn: () => getProject({ virtualLabId, projectId }),
    })
  );

  if (!data || error) {
    redirect(`${config.ROOT_ROUTE}/sync`, RedirectType.replace);
  }

  if (data.is_waitlisted) {
    const lab = await getVirtualLab({ id: virtualLabId }).catch(() => null);
    const startDate = lab?.course?.start_date ? new Date(lab.course.start_date) : null;
    const courseId = lab?.course?.id;

    if (!startDate || startDate > new Date()) {
      redirect(
        `${config.ROOT_ROUTE}/virtual-lab/${virtualLabId}/${projectId}/course-not-started`,
        RedirectType.replace
      );
    }

    if (courseId) {
      await activateEnrolment(courseId);
    }
  }

  queryClient.prefetchQuery({
    queryKey: keyBuilderHierarchy.hierarchies(),
    queryFn: async () => {
      const result = await getBrainRegionHierarchiesWithSpecies();
      result.data
        .map((o) => o.id)
        .filter((id) => !config.EXCLUDED_HIERARCHY_IDS.includes(id))
        .forEach((id) => {
          queryClient.prefetchQuery({
            queryKey: keyBuilderHierarchy.hierarchy({ id }),
            queryFn: () => getBrainRegionHierarchy({ id }),
            staleTime: Infinity,
            gcTime: Infinity,
          });
        });
      return result;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  queryClient.prefetchQuery({
    queryKey: keyBuilderAtlas.all(),
    queryFn: () => getBrainAtlases({}),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  queryClient.prefetchQuery({
    queryKey: keyBuilderHierarchy.hierarchyPreference(),
    queryFn: () => getWorkspaceHierarchySpeciesPreference(),
    staleTime: Infinity,
  });

  queryClient.prefetchQuery({
    queryKey: keyBuilder.membership(),
    queryFn: getUserGroups,
  });

  return (
    <div className="h-screen w-full">
      <ProjectRootLayout>
        <div className="w-full p-3 pb-0 [grid-area:header]">
          <WorkspaceTopMenu />
        </div>
        <div
          id="workspace-body"
          className="secondary-scrollbar w-full overflow-x-hidden overflow-y-auto pb-3 [grid-area:main]"
        >
          {children}
        </div>
        <SpaceManagerContainer />
        <AiContainer />
      </ProjectRootLayout>
    </div>
  );
}
