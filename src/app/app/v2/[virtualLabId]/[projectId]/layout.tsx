import type { ReactNode } from 'react';

import { AppOnboardingProvider } from '@/ui/segments/app-setup/discover-app';
import { SpaceManagerContainer } from '@/ui/segments/workspaces/space-manager';
import { ProjectRootLayout } from '@/ui/layouts/project-root-layout';
import { WorkspaceTopMenu } from '@/ui/segments/workspaces/top-menu';
import { Container as AiContainer } from '@/ui/segments/ai/container';

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <AppOnboardingProvider>
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
    </AppOnboardingProvider>
  );
}
