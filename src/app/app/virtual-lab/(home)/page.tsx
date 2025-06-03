import { Suspense } from 'react';
import { Metadata } from 'next';
import { Spin } from 'antd';
import { ErrorBoundary } from 'react-error-boundary';
import { LoadingOutlined } from '@ant-design/icons';

import MembershipsVirtualLabsList from '@/components/VirtualLab/labs-listing/membership-list';
import MyVirtualLabCard from '@/components/VirtualLab/labs-listing/my-virtual-lab';
import VirtualSplashScreen from '@/components/VirtualLab/labs-listing/no-vlabs';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import Tabs from '@/components/VirtualLab/labs-listing/menu-tabs';

import { getUserActiveSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { ErrorListing } from '@/components/VirtualLab/labs-listing/elements';
import { getUserStats } from '@/api/virtual-lab-svc/queries/stats';
import { tryCatch } from '@/api/utils';
import { TutorialsCarrousel } from '@/components/tutorials-carrousel';

import type { ServerSideComponentProp } from '@/types/common';

const tabs = [
  {
    key: 'my-virtual-lab',
    label: 'My virtual lab',
  },
  {
    key: 'membership-labs',
    label: 'Virtual lab memberships',
  },
];

type Props = ServerSideComponentProp<
  null,
  {
    t: string;
    page: string;
    q: string;
    size: string;
  }
>;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { t } = await props.searchParams;
  const activeTabId = t as string;

  let title = 'Virtual labs';
  let description = 'View and manage your virtual labs, create new projects.';

  if (activeTabId === 'my-virtual-lab' || !activeTabId) {
    title = 'My virtual lab';
    description = 'View and manage your virtual lab, create new projects.';
  }
  if (activeTabId === 'membership-labs') {
    title = 'Membership labs';
    description = 'Explore and join virtual labs created by other users.';
  }

  return {
    title,
    description,
  };
}

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: Props) {
  const { t, page, q, size } = await searchParams;
  const activeTabId = t || tabs[0].key;
  const { data, error } = await tryCatch(
    Promise.allSettled([getUserStats(), getUserActiveSubscription()]),
    undefined,
    {
      section: 'virtual-lab-home-page',
      feature: 'get-user-stats',
      extra: { 'get-user-stats': true, 'get-user-active-subscription': true },
    }
  );
  const stats = data?.[0].status === 'fulfilled' ? data[0].value.data : null;
  const subscription = data?.[1].status === 'fulfilled' ? data[1].value?.subscription : null;
  const hasProSubscription = Boolean(subscription && subscription?.type !== 'free');
  const hasVirtualLabs = Boolean(stats && stats.total_labs > 0);

  const statsError = data?.[0].status === 'rejected' ? data[0].reason : null;
  const subscriptionError = data?.[1].status === 'rejected' ? data[1].reason : null;

  if (error || statsError || subscriptionError) {
    return <ErrorListing />;
  }

  if (!hasVirtualLabs) {
    return <VirtualSplashScreen showCreateSubscription={!hasProSubscription} />;
  }
  const Loading = (
    <div className="flex h-screen items-center justify-center">
      <Spin indicator={<LoadingOutlined />} size="large" />
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <Tabs items={tabs} activeTabId={activeTabId} basePath="/app/virtual-lab" />
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <Suspense fallback={Loading}>
          {activeTabId === 'my-virtual-lab' && (
            <MyVirtualLabCard hasProSubscription={hasProSubscription} />
          )}
          {activeTabId === 'membership-labs' && (
            <MembershipsVirtualLabsList searchParams={{ page, q, size }} />
          )}
        </Suspense>
      </ErrorBoundary>
      <TutorialsCarrousel />
    </div>
  );
}
