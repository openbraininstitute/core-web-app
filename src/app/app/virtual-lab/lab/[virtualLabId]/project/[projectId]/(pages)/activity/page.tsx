import { Suspense, use } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import ActivityTable, {
  tabsConfigItems,
  defaultTabKey,
} from '@/features/activity-view/listing-view';
import ErrorData from '@/components/message-banners/error';
import Tabs from '@/components/detail-view-tabs';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { EntityTypeValue } from '@/api/entitycore/types';

function ErrorFallback() {
  return (
    <ErrorData
      title="Something went wrong"
      description="We couldn’t load your activities for selected type. Please try again later or contact support if the issue persists."
    />
  );
}

export default async function Page(
  _: ServerSideComponentProp<
    WorkspaceContext,
    {
      type: Extract<
        EntityTypeValue,
        | 'single_neuron_synaptome_simulation'
        | 'single_neuron_synaptome'
        | 'memodel'
        | 'single_neuron_simulation'
      >;
    }
  >
) {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <div className="flex h-full w-full flex-col">
        <Tabs
          tabsConfig={tabsConfigItems}
          tabKey={defaultTabKey}
          cls={{ btn: 'line-clamp-1 text-base' }}
        />
        <Suspense fallback={<div className="flex h-full items-center justify-center" />}>
          <ActivityTable />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
