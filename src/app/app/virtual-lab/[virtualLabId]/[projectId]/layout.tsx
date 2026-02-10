import {
  getBrainRegionHierarchiesWithSpecies,
  getBrainRegionHierarchy,
} from '@/api/entitycore/queries/general/brain-region';
import { getWorkspaceHierarchySpeciesPreference } from '@/api/virtual-lab-svc/queries/user';
import { getQueryClient } from '@/query-provider/server';
import { ProjectRootLayout } from '@/ui/layouts/project-root-layout';
import { Container as AiContainer } from '@/ui/segments/ai/container';
import { SpaceManagerContainer } from '@/ui/segments/workspaces/space-manager';
import { WorkspaceTopMenu } from '@/ui/segments/workspaces/top-menu';
import { keyBuilderHierarchy } from '@/ui/use-query-keys/atlas';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export default async function Layout({ children }: Props) {
  const queryClient = getQueryClient();
  queryClient.prefetchQuery({
    queryKey: keyBuilderHierarchy.hierarchies(),
    queryFn: async () => {
      const result = await getBrainRegionHierarchiesWithSpecies();
      result.data
        .map((o) => o.id)
        .forEach((id) => {
          queryClient.prefetchQuery({
            queryKey: keyBuilderHierarchy.hierarchy({ id }),
            queryFn: () => getBrainRegionHierarchy({ id }),
            staleTime: Infinity,
            gcTime: Infinity,
          });
        });
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

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
