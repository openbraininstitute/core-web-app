import { RedirectType, redirect } from 'next/navigation';

import { tryCatch } from '@/api/utils';
import { activateEnrolment } from '@/api/virtual-lab-svc/queries/course';
import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { config } from '@/config';
import { ChatLauncher } from '@/features/chat/chat-launcher';
import { ChatStreamProvider } from '@/features/chat/chat-stream';
import { PinnedWalkthrough } from '@/features/learn/ui/pinned-walkthrough';
import { makeRoles } from '@/hooks/use-user-membership';
import { getQueryClient } from '@/query-provider/server';
import { ProjectRootLayout } from '@/ui/layouts/project-root-layout';
import { Container as AiContainer } from '@/ui/segments/ai/container';
import { ProjectToolbar } from '@/ui/segments/workspaces/project-toolbar';
import { SpaceManagerContainer } from '@/ui/segments/workspaces/space-manager';
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

  // Prefetch here only together with `HydrateClient` (`@/query-provider/server`).

  return (
    // on a phone the height that can be seen, not the full screen's under the browser's bars
    <div className="h-screen w-full max-md:h-dvh">
      {/* one stream of chat events per tab, for the chat button and its window */}
      <ChatStreamProvider>
        <ProjectRootLayout>
          <div className="w-full [grid-area:header]">
            <ProjectToolbar />
          </div>
          <div
            id="workspace-body"
            // on a phone, room under the page for the tabs along the screen's foot
            className="secondary-scrollbar w-full overflow-x-hidden overflow-y-auto pb-2 [grid-area:main] max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))]"
          >
            {children}
          </div>
          <SpaceManagerContainer />
          <AiContainer />
        </ProjectRootLayout>
        <ChatLauncher />
        <PinnedWalkthrough />
      </ChatStreamProvider>
      {/* On a phone, room to scroll the page by exactly the browser's bars while they show (the full height less what
          is seen), so a swipe still tucks them away (the user asked; with the page only the height seen, they never
          went), and none once they have gone. */}
      <div aria-hidden className="h-[calc(100lvh-100dvh)] md:hidden" />
    </div>
  );
}
