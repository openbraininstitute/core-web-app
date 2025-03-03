import { Metadata } from 'next';

import { getVirtualLabsOfUser } from '@/services/virtual-lab/labs';
import LabsListing from '@/components/VirtualLab/labs-listing/listing';
import CreateFirstLab from '@/components/VirtualLab/labs-listing/no-vlabs';

export const metadata: Metadata = {
  title: 'Virtual labs',
  description: 'View and manage your virtual labs, create new projects.',
};

export default async function Page() {
  try {
    const labs = await getVirtualLabsOfUser();
    if (!labs.data.total) {
      return <CreateFirstLab />;
    }

    return <LabsListing virtualLabs={labs.data.results} />;
  } catch (error) {
    throw new Error((error as { message: string }).message);
  }
}
