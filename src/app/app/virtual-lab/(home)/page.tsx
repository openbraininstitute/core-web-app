import { Metadata } from 'next';

import LabsListing from '@/components/VirtualLab/labs-listing/listing';
import CreateFirstLab from '@/components/VirtualLab/labs-listing/no-vlabs';
import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';

export const metadata: Metadata = {
  title: 'Virtual labs',
  description: 'View and manage your virtual labs, create new projects.',
};

export default async function Page() {
  try {
    const labs = await listVirtualLabs();
    if (!labs.data?.virtual_lab) {
      return <CreateFirstLab />;
    }

    return (
      <LabsListing
        virtualLab={{
          data: labs.data.virtual_lab,
          membersCount: labs.data.members_count,
          projectsCount: labs.data.projects_count,
        }}
        pendingLabs={labs.data.pending_labs}
      />
    );
  } catch (error) {
    throw new Error((error as { message: string }).message);
  }
}
