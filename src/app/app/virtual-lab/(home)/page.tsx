import { ReactNode } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getVirtualLabsOfUser } from '@/services/virtual-lab/labs';
import LabsListing from '@/components/VirtualLab/labs-listing';

export const metadata: Metadata = {
  title: 'Virtual labs',
  description: 'View and manage your virtual labs, create new projects.',
};

export default async function Page() {
  let redirectUrl: string | null = null;
  let node: ReactNode = null;

  try {
    const labs = await getVirtualLabsOfUser();
    if (!labs.data.total) redirectUrl = '/app/virtual-lab/create';
    else node = <LabsListing virtualLabs={labs.data.results} />;
  } catch (error) {
    throw new Error((error as { message: string }).message);
  }

  if (redirectUrl) redirect(redirectUrl);
  else return node;
}
