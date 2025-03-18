import { Metadata } from 'next';

import { ErrorBoundary } from 'react-error-boundary';
import LabsListing from '@/components/VirtualLab/labs-listing/listing';
import CreateFirstLab from '@/components/VirtualLab/labs-listing/no-vlabs';
import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import SideBar from '@/components/VirtualLab/side-bar/home-sidebar';
import Logout from '@/components/VirtualLab/side-bar/logout';

export const metadata: Metadata = {
  title: 'Virtual labs',
  description: 'View and manage your virtual labs, create new projects.',
};

export const dynamic = 'force-dynamic';
export default async function Page() {
  try {
    const labs = await listVirtualLabs();
    return (
      <div className="flex h-screen flex-col bg-primary-9 p-5 text-white">
        <div className="no-scrollbar h-full gap-12 overflow-y-auto overflow-x-hidden">
          <SideBar
            labsCount={(labs.data?.pending_labs?.length ?? 0) + (labs.data?.virtual_lab ? 1 : 0)}
          />
          <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
            <div className="ml-80 flex w-[calc(100%-20rem)] items-end justify-end">
              <Logout />
            </div>
            <div className="ml-80 mt-4 flex h-full w-[calc(100%-20rem)] flex-grow flex-col">
              {!labs.data?.virtual_lab ? (
                <CreateFirstLab />
              ) : (
                <LabsListing
                  virtualLab={{
                    data: labs.data?.virtual_lab,
                    membersCount: labs.data?.members_count,
                    projectsCount: labs.data?.projects_count,
                  }}
                  pendingLabs={labs.data?.pending_labs}
                />
              )}
            </div>
          </ErrorBoundary>
        </div>
      </div>
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`We encountered an issue while loading your virtual labs: ${errorMessage}`, {
      cause: error,
    });
  }
}
