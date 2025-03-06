import { Metadata } from 'next';

import LabsListing from '@/components/VirtualLab/labs-listing/listing';
import CreateFirstLab from '@/components/VirtualLab/labs-listing/no-vlabs';
import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { ErrorBoundary } from 'react-error-boundary';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import SideBar from '@/components/VirtualLab/side-bar/home-sidebar';

export const metadata: Metadata = {
  title: 'Virtual labs',
  description: 'View and manage your virtual labs, create new projects.',
};

export default async function Page() {
  try {
    const labs = await listVirtualLabs();
    return (
      <div className="flex h-screen flex-col bg-primary-9 p-5 text-white">
        <div className="grid h-full grid-cols-[max-content_1fr] gap-12 overflow-hidden">
          <SideBar labsCount={(labs.data?.pending_labs.length ?? 0) + (labs.data?.virtual_lab ? 1 : 0)} />
          <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
            <div className="overflow-hidden">
              {!labs.data?.virtual_lab ? (
                <CreateFirstLab />
              ) : (
                <LabsListing
                  virtualLab={{
                    data: labs.data.virtual_lab,
                    membersCount: labs.data.members_count,
                    projectsCount: labs.data.projects_count,
                  }}
                  pendingLabs={labs.data.pending_labs}
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
