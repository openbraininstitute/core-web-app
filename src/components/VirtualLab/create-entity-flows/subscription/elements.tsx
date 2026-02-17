import { CloseCircleFilled, ExclamationCircleFilled, InfoCircleFilled } from '@ant-design/icons';

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
    <div className="bg-destructive-foreground my-6 transform rounded-xs p-6 transition-all duration-500">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-destructive mb-2 text-xl font-bold">Subscription History</h2>
          <p className="text-destructive max-w-xl">
            We encountered an issue while retrieving your subscription history. Please try again
            later or contact support at{' '}
            <a href="mailto:support@openbraininstitute.org">support@openbraininstitute.org</a>.
          </p>
        </div>
        <div className="mb-2 flex items-center gap-2 self-baseline">
          <CloseCircleFilled className="text-destructive text-xl" />
        </div>
      </div>
    </div>
  );
}

export function HistoryEmpty() {
  return (
    <div className="bg-primary-8 mb-6 transform rounded-xs p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl">
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

export function SubscriptionCheckoutError() {
  return (
    <div
      data-testid="subscription-checkout-error"
      className="mb-6 transform rounded-xs bg-red-900 p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl"
    >
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
