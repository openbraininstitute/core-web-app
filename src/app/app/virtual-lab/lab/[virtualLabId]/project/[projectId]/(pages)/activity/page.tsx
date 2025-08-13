import { LoadingOutlined } from '@ant-design/icons';
import { ErrorBoundary } from 'react-error-boundary';
import { Suspense } from 'react';
import { Spin } from 'antd';

import ActivityTable, {
  tabsConfigItems,
  defaultTabKey,
} from '@/features/activity-view/listing-view';
import ErrorData from '@/components/message-banners/error';
import Tabs from '@/components/detail-view-tabs';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { TEntityTypeDict } from '@/api/entitycore/types';

function ErrorFallback() {
  return (
    <ErrorData
      title="Something went wrong"
      description="We couldn’t load your activities. Please try again later or contact support if the issue persists."
    />
  );
}

export default async function Page({
  params,
  searchParams,
}: ServerSideComponentProp<
  WorkspaceContext,
  {
    type: Extract<
      TEntityTypeDict,
      | 'single_neuron_synaptome_simulation'
      | 'single_neuron_synaptome'
      | 'memodel'
      | 'single_neuron_simulation'
    >;
  }
>) {
  const { projectId } = await params;
  const { type } = await searchParams;
  return (
    <ErrorBoundary fallback={<ErrorFallback />} key={`${projectId}/${type}`}>
      <div className="flex h-full w-full flex-col">
        <Tabs
          tabsConfig={tabsConfigItems}
          tabKey={defaultTabKey}
          cls={{
            btn: 'line-clamp-1 text-base ',
            tab: {
              active: 'text-primary-9! bg-white! font-extrabold!',
              inactive: 'bg-primary-9! text-white!',
            },
          }}
        />
        <div className="mt-3">
          <Suspense
            fallback={
              <div className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-3">
                <Spin indicator={<LoadingOutlined />} size="large" />
                <h2 className="font-light text-white">Loading...</h2>
              </div>
            }
          >
            <ActivityTable />
          </Suspense>
        </div>
      </div>
    </ErrorBoundary>
  );
}
