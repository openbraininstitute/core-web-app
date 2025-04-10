import { Metadata } from 'next';
import { ErrorBoundary } from 'react-error-boundary';
import { ExclamationCircleFilled } from '@ant-design/icons';
import Link from 'next/link';

import LabsListing from '@/components/VirtualLab/labs-listing/listing';
import CreateFirstLab from '@/components/VirtualLab/labs-listing/no-vlabs';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { getUserActiveSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { tryCatch } from '@/api/utils';
import { classNames } from '@/util/utils';

export const metadata: Metadata = {
  title: 'Virtual labs',
  description: 'View and manage your virtual labs, create new projects.',
};

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { data: result, error } = await tryCatch(
    Promise.all([listVirtualLabs(), getUserActiveSubscription()]),
    undefined,
    {
      section: 'virtual-lab-home-page',
      feature: 'list-virtual-labs',
    }
  );

  if (error) {
    return (
      <div
        data-testid="virtual-labs-error"
        className="mb-6 transform rounded-xs bg-red-900 p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl"
      >
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="mb-2 text-2xl font-bold text-red-200">Unable to load virtual labs</h2>
            <p className="max-w-xl text-red-200/80">
              Please try refreshing the page or return later. If the issue persists, please contact
              support at{' '}
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
  return (
    <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
      {result?.[1]?.subscription.type === 'free' && (
        <Link
          href="/app/virtual-lab/account/subscription"
          className={classNames(
            'relative',
            'mx-auto mb-6 h-32 w-full max-w-7xl rounded-lg p-6',
            'z-0 bg-[rgb(39,111,201)]',
            'bg-linear-to-r from-[rgba(39,111,201,1)] to-[rgba(0,34,77,1)]'
          )}
        >
          <div
            style={{
              background: "url('/images/get-pro-bg.webp') no-repeat center right",
              backgroundSize: '50%',
              backgroundPosition: 'right',
            }}
          />
          <h2 className="z-10 text-2xl font-semibold">Get your Pro plan</h2>
          <p className="z-10 text-gray-200">
            In order to join other labs or invite teammates in your lab...
          </p>
        </Link>
      )}
      {!result?.[0]?.data?.virtual_lab ? (
        <CreateFirstLab />
      ) : (
        <LabsListing
          virtualLab={result?.[0]?.data.virtual_lab}
          membership_labs={result?.[0]?.data.membership_labs}
          pendingLabs={result?.[0]?.data.pending_labs}
        />
      )}
    </ErrorBoundary>
  );
}
