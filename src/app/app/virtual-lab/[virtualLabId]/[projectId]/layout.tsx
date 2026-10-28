import { RedirectType, redirect } from 'next/navigation';

import { tryCatch } from '@/api/utils';
import { activateEnrolment } from '@/api/virtual-lab-svc/queries/course';
import { getProject } from '@/api/virtual-lab-svc/queries/project';
import {
  getUserGroups,
  getWorkspaceHierarchySpeciesPreference,
} from '@/api/virtual-lab-svc/queries/user';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { config } from '@/config';
import { makeRoles } from '@/hooks/use-user-membership';
import { getQueryClient } from '@/query-provider/server';
import { ProjectRootLayout } from '@/ui/layouts/project-root-layout';
import { Container as AiContainer } from '@/ui/segments/ai/container';
import { SpaceManagerContainer } from '@/ui/segments/workspaces/space-manager';
import { WorkspaceTopMenu } from '@/ui/segments/workspaces/top-menu';
import { keyBuilderHierarchy } from '@/ui/use-query-keys/atlas';
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

  const userGroups = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilder.membership(),
      queryFn: getUserGroups,
    })
  );

  const { isVirtualLabAdmin } = makeRoles(userGroups.data ?? undefined, virtualLabId, projectId);

  if (data.is_waitlisted && !isVirtualLabAdmin) {
    const lab = await getVirtualLab({ id: virtualLabId });
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

  // The atlas list, the hierarchy list and the default region tree are not
  // prefetched here: this layout does not dehydrate its query client, so the
  // browser fetched each of them again and the server's copy was thrown away
  // (about 880 server requests and 25 MB per E2E run, one of each per page
  // render). The components that need them fetch them with `useQuery`, keep
  // them for the session (`staleTime: Infinity`), and revalidate them with
  // entitycore's ETag on a reload. Prefetch here only together with
  // `HydrateClient` (`@/query-provider/server`).

  queryClient.prefetchQuery({
    queryKey: keyBuilderHierarchy.hierarchyPreference(),
    queryFn: () => getWorkspaceHierarchySpeciesPreference(),
    staleTime: Infinity,
  });

  return (
    <div className="h-screen w-full">
      <ProjectRootLayout>
        <div className="w-full p-3 pb-0 [grid-area:header]">
          <WorkspaceTopMenu />
        </div>
        <div
          id="workspace-body"
          className="secondary-scrollbar w-full overflow-x-hidden overflow-y-auto pb-2 [grid-area:main]"
        >
          {children}
        </div>
        <SpaceManagerContainer />
        <AiContainer />
      </ProjectRootLayout>
    </div>
  );
}
