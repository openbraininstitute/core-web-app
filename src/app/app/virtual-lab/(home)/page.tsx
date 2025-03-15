import { Metadata } from 'next';
import { ErrorBoundary } from 'react-error-boundary';

import LabsListing from '@/components/VirtualLab/labs-listing/listing';
import CreateFirstLab from '@/components/VirtualLab/labs-listing/no-vlabs';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import SideBar from '@/components/VirtualLab/side-bar/home-sidebar';
import Logout from '@/components/VirtualLab/side-bar/logout';

import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { tryCatch } from '@/api/utils';

export const metadata: Metadata = {
  title: 'Virtual labs',
  description: 'View and manage your virtual labs, create new projects.',
};

export const dynamic = 'force-dynamic';
export default async function Page() {
  try {
    const result = await tryCatch(listVirtualLabs({ page: 1, pageSize: 10 }));

    if (result.error) {
      throw new Error((result.error as { message: string }).message);
    }

    const labs = result.data;

    return (
      <div className="flex h-screen flex-col bg-primary-9 p-5 text-white">
        <div className="no-scrollbar h-full gap-12 overflow-y-auto overflow-x-hidden">
          <SideBar labsCount={labs.data?.total} />
          <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
            <div className="sticky top-0 ml-80 flex w-[calc(100%-20rem)] items-end justify-end">
              <Logout />
            </div>
            <div className="my-4 ml-80 flex h-[calc(100vh-7.5rem)] w-[calc(100%-20rem)] flex-grow flex-col overflow-hidden">
              {!labs.data?.total ? (
                <CreateFirstLab />
              ) : (
                <LabsListing
                  labs={labs.data?.results || []}
                  initialPage={labs.data?.page || 1}
                  pageSize={labs.data?.page_size || 10}
                  totalItems={labs.data?.total || 0}
                />
              )}
            </div>
          </ErrorBoundary>
        </div>
      </div>
    );
  } catch (error) {
    throw new Error((error as { message: string }).message);
  }
}
