import { Metadata } from 'next';
import { ErrorBoundary } from 'react-error-boundary';

import LabsListing from '@/components/VirtualLab/labs-listing/listing';
import CreateFirstLab from '@/components/VirtualLab/labs-listing/no-vlabs';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import SideBar from '@/components/VirtualLab/side-bar/home-sidebar';
import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { tryCatch } from '@/api/utils';

export const metadata: Metadata = {
  title: 'Virtual labs',
  description: 'View and manage your virtual labs, create new projects.',
};

export const dynamic = 'force-dynamic';
export default async function Page() {
  const { data: result, error } = await tryCatch(listVirtualLabs());
  if (error) {
    throw new Error((error as { message: string }).message);
  }
  return (
    <div className="flex h-screen flex-col bg-primary-9 p-5 text-white">
      <div className="no-scrollbar h-full gap-12 overflow-y-auto overflow-x-hidden">
        <SideBar
          labsCount={
            (result?.data?.pending_labs?.length ?? 0) + (result?.data?.virtual_lab ? 1 : 0)
          }
        />
        <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
          <div className="ml-80 flex h-full w-[calc(100%-20rem)] flex-grow flex-col">
            {!result?.data?.virtual_lab ? (
              <CreateFirstLab />
            ) : (
              <LabsListing
                virtualLab={{
                  data: result.data.virtual_lab,
                  membersCount: result.data?.members_count,
                  projectsCount: result.data?.projects_count,
                }}
                pendingLabs={result.data?.pending_labs}
              />
            )}
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
}
