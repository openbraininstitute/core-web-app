import { ErrorBoundary } from 'react-error-boundary';

import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import SideBar from '@/components/VirtualLab/side-bar/home-sidebar';

import { tryCatch } from '@/api/utils';
import PublicProjectList from '@/components/PublicProjects/PublicProjectList';
import Logout from '@/components/VirtualLab/side-bar/logout';

export const dynamic = 'force-dynamic';

export default async function PublicProjectsListingPage() {
  const { data: result, error } = await tryCatch(listVirtualLabs());
  if (error) {
    throw new Error((error as { message: string }).message);
  }

  return (
    <div className="flex h-screen w-full flex-col bg-primary-9 p-5 text-white">
      <div className="no-scrollbar h-full w-full gap-12 overflow-y-auto overflow-x-hidden">
        <SideBar
          labsCount={
            (result?.data?.pending_labs?.length ?? 0) + (result?.data?.virtual_lab ? 1 : 0)
          }
        />
        <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
          <div className="flex w-full flex-row justify-between gap-x-8">
            <PublicProjectList />
            <Logout />
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
}
