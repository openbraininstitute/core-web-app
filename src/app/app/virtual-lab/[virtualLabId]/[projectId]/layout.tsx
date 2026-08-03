import { Suspense } from 'react';

import { getBrainAtlases } from '@/api/entitycore/queries/general/brain-atlas';
import {
  getBrainRegionHierarchiesWithSpecies,
  getBrainRegionHierarchy,
} from '@/api/entitycore/queries/general/brain-region';
import {
  getUserGroups,
  getWorkspaceHierarchySpeciesPreference,
} from '@/api/virtual-lab-svc/queries/user';
import { config } from '@/config';
import { getQueryClient } from '@/query-provider/server';
import { ProjectRootLayout } from '@/ui/layouts/project-root-layout';
import { WorkspaceBodyTransition } from '@/ui/layouts/workspace-body-transition';
import { Container as AiContainer } from '@/ui/segments/ai/container';
import { SectionLocationRecorder } from '@/ui/segments/workspaces/section-location-recorder';
import { SpaceManagerContainer } from '@/ui/segments/workspaces/space-manager';
import { WorkspaceTopMenu } from '@/ui/segments/workspaces/top-menu';
import { keyBuilderAtlas, keyBuilderHierarchy } from '@/ui/use-query-keys/atlas';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

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
        <WorkspaceBodyTransition>{children}</WorkspaceBodyTransition>
        <Suspense>
          <SectionLocationRecorder />
        </Suspense>
        <SpaceManagerContainer />
        <AiContainer />
      </ProjectRootLayout>
    </div>
  );
}
