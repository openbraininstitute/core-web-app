import { ErrorBoundary } from 'react-error-boundary';

import VirtualLabProjectSidebar from '@/components/VirtualLab/projects/VirtualLabProjectSidebar';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import SideMenu from '@/components/SideMenu';

import { LabProjectLayoutProps } from '@/types/virtual-lab/layout';
import { Label, LinkItemKey } from '@/constants/virtual-labs/sidemenu';
import { generateLabUrl } from '@/util/virtual-lab/urls';

export default async function VirtualLabProjectLayout({
  params: promisedParams,
  children,
}: LabProjectLayoutProps) {
  const params = await promisedParams;

  const labUrl = generateLabUrl(params.virtualLabId);
  const labProjectUrl = `${labUrl}/project/${params.projectId}`;

  return (
    <div className="bg-primary-9 grid h-screen grid-cols-[1fr_3fr] grid-rows-1 pr-5 text-white">
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <div className="flex flex-row gap-4">
          <SideMenu
            links={[]}
            lab={{
              key: LinkItemKey.VirtualLab,
              id: params.virtualLabId,
              label: Label.VirtualLab,
              href: `${labUrl}/overview`,
            }}
            project={{
              key: LinkItemKey.Project,
              id: params.projectId,
              virtualLabId: params.virtualLabId,
              label: Label.Project,
              href: `${labProjectUrl}/home`,
            }}
          />
          <VirtualLabProjectSidebar
            virtualLabId={params.virtualLabId}
            projectId={params.projectId}
          />
        </div>
      </ErrorBoundary>
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <div className="mt-8 flex w-full flex-col gap-10 overflow-x-hidden overflow-y-auto pr-3">
          {children}
        </div>
      </ErrorBoundary>
    </div>
  );
}
