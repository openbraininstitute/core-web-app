import type { ReactNode } from 'react';

import { VirtualLabConfigModal } from '@/ui/segments/virtual-lab-configuration/modal';
import { UserConfigurationModal } from '@/ui/segments/profile/modal';
import { ProjectRootLayout } from '@/ui/layouts/project-root-layout';
import { WorkspaceTopMenu } from '@/ui/segments/workspace-top-menu';

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <ProjectRootLayout>
      <div className="w-full p-3 [grid-area:header]">
        <WorkspaceTopMenu />
      </div>
      <div id="body" className="secondary-scrollbar w-full overflow-y-auto [grid-area:main]">
        {children}
      </div>
      <VirtualLabConfigModal />
      <UserConfigurationModal />
    </ProjectRootLayout>
  );
}
