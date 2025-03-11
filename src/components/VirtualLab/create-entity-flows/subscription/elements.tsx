import {
  CheckCircleFilled,
  ExclamationCircleFilled,
  CloseCircleFilled,
  InfoCircleFilled,
} from '@ant-design/icons';
import { format } from 'date-fns';
import Link from 'next/link';

import { classNames } from '@/util/utils';
import {
  SubscriptionStatus,
  UserActiveSubscriptionResponse,
} from '@/api/virtual-lab-svc/queries/types';

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'succeeded':
    case 'paid':
      return 'text-green-400';
    case 'pending':
      return ' text-yellow-400';
    case 'failed':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

export function HistoryError() {
  return (
    <div className="mb-6 transform rounded-sm bg-red-900 p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-red-200">Subscription History</h2>
          <p className="max-w-xl text-red-200/80">
            We encountered an issue while retrieving your subscription history. Please try again
            later or contact support at{' '}
            <a href="mailto:support@openbraininstitute.org">support@openbraininstitute.org</a>.
          </p>
        </div>
        <div className="mb-2 flex items-center gap-2 self-baseline">
          <CloseCircleFilled className="text-2xl text-red-500" />
        </div>
      </div>
    </div>
  );
}

export function HistoryEmpty() {
  return (
    <div className="mb-6 transform rounded-sm bg-primary-8 p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="mb-2 text-2xl font-bold">Subscription History</h2>
          <p className="max-w-xl text-blue-200/80">No subscription history found.</p>
        </div>
        <div className="mb-2 flex items-center gap-2 self-baseline">
          <InfoCircleFilled className="text-2xl text-blue-600" />
        </div>
      </div>
    </div>
  );
}

export function ErrorSubscriptionStatus() {
  return (
    <div className="mb-6 transform rounded-sm bg-red-900 p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-red-200">Subscription Error</h2>
          <p className="max-w-xl text-red-200/80">
            We encountered an issue while retrieving your subscription details. Please try again
            later or contact support at{' '}
            <a href="mailto:support@openbraininstitute.org">support@openbraininstitute.org</a>.
          </p>
        </div>
        <div className="mb-2 flex items-center gap-2 self-baseline">
          <ExclamationCircleFilled className="text-2xl text-yellow-400" />
          <span className="text-xl font-bold text-yellow-400">Error</span>
        </div>
      </div>
    </div>
  );
}

export function NoSubscriptionFound() {
  return (
    <div className="w-full">
      <div className="mb-3 transform rounded-sm border border-white/50 bg-transparent p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="mb-2 text-2xl font-bold text-white">No subscription</h2>
            <p className="max-w-xl text-white">
              Please create your virtual lab and start your free subscription and explore the world
              of neuroscience.
            </p>
          </div>
          <div className="mb-2 flex items-center gap-2 self-baseline">
            <InfoCircleFilled className="text-2xl text-white" />
          </div>
        </div>
      </div>
      <div className="flex w-full items-center justify-end gap-3">
        <Link
          href="/app/virtual-lab/lab/create"
          key="create-vlab-link"
          className={classNames(
            'flex h-14 items-center justify-center rounded-none border border-white bg-primary-9 px-14 text-lg text-white',
            'hover:!border hover:!border-primary-8 hover:bg-primary-8 hover:font-bold hover:!text-white hover:shadow-sm',
            'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
            'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
          )}
        >
          Create virtual lab
        </Link>
      </div>
    </div>
  );
}

export function FreeSubscriptionStatus() {
  return (
    <div className="mb-6 transform rounded-sm bg-primary-8 p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="mb-2 text-2xl font-bold">Free plan</h2>
          <p className="max-w-xl text-blue-200/80">
            An OBI membership offers tools to explore, build, and simulate neuron and brain models,
            leveraging Brain-CODE and expert collaboration for neuroscience breakthroughs.
          </p>
        </div>
        <div className="mb-2 flex items-center gap-2 self-baseline">
          <CheckCircleFilled className="text-2xl text-green-400" />
          <span className="text-xl font-bold text-green-400">Active</span>
        </div>
      </div>
    </div>
  );
}

export function PaidSubscriptionStatus({ data }: { data: UserActiveSubscriptionResponse }) {
  return (
    <div className="mb-6 transform rounded-sm bg-primary-8 p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="mb-2 text-2xl font-bold">Pro plan</h2>
          <p className="max-w-xl text-blue-200/80">
            An OBI membership offers tools to explore, build, and simulate neuron and brain models,
            leveraging Brain-CODE and expert collaboration for neuroscience breakthroughs.
          </p>
        </div>
        <div className="flex flex-col items-end">
          {data?.subscription.status === SubscriptionStatus.ACTIVE && (
            <div className="mb-2 flex items-center gap-2 align-baseline">
              <CheckCircleFilled className="h-5 w-5 text-green-400" />
              <span className="font-medium text-green-400">Active</span>
            </div>
          )}
          {data?.subscription.cancel_at_period_end && data?.subscription.current_period_end ? (
            <p className="text-gray-300">
              Cancel at: {format(new Date(data?.subscription.current_period_end), 'MMM dd, yyyy')}
            </p>
          ) : (
            data?.subscription.next_billing_date && (
              <p className="text-gray-300">
                Next payment:{' '}
                {format(new Date(data?.subscription.next_billing_date), 'MMM dd, yyyy')}
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export function SubscriptionCheckoutError() {
  return (
    <div className="mb-6 transform rounded-sm bg-red-900 p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-red-200">
            Unable to Load Subscription Checkout
          </h2>
          <p className="max-w-xl text-red-200/80">
            We&lsquo;re unable to load the subscription plans and payment options at this time. This
            could be preventing you from viewing available plans or completing your purchase. Please
            try refreshing the page or return later. If the issue persists, please contact support
            at <a href="mailto:support@openbraininstitute.org">support@openbraininstitute.org</a>.
          </p>
        </div>
        <div className="mb-2 flex items-center gap-2 self-baseline">
          <ExclamationCircleFilled className="text-2xl text-yellow-400" />
          <span className="text-xl font-bold text-yellow-400">Error</span>
        </div>
      </div>
    </div>
  );
}
