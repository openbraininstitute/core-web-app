import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getVirtualLabsOfUser } from '@/services/virtual-lab/labs';
import VirtualLabDashboard from '@/components/VirtualLab/VirtualLabDashboard';

export const metadata: Metadata = {
  title: 'Virtual labs',
};

export default async function VirtualLabMainPage() {
  let redirectPath: string | null = null;
  let toRender: ReactNode = null;
  try {
    const virtualLabs = await getVirtualLabsOfUser();
    if (!virtualLabs.data.results || virtualLabs.data.results.length === 0) {
      redirectPath = '/app/virtual-lab/sandbox/home';
    }

    toRender = <VirtualLabDashboard virtualLabs={virtualLabs.data.results} />;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('fetching virtual labs failed:', error);
    toRender = (
      <div className="flex h-[calc(100vh-6rem)] w-full flex-col items-center justify-center">
        <div className="rounded-md border border-white bg-primary-9 p-12 text-center shadow-sm">
          <h1 className="text-3xl font-bold text-white">Unable to load virtual labs</h1>
          <p className="text-lg text-white">
            We encountered an issue while loading your virtual labs. Please try again later.
          </p>
        </div>
      </div>
    );
  } finally {
    if (redirectPath) {
      redirect(redirectPath);
    }
  }
  return toRender;
}
