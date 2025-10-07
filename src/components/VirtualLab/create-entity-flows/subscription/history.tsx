import flatMap from 'es-toolkit/compat/flatMap';

import { BillingTable } from '@/components/VirtualLab/create-entity-flows/subscription/billing-table';
import {
  HistoryEmpty,
  HistoryError,
} from '@/components/VirtualLab/create-entity-flows/subscription/elements';
import { listUserSubscriptionsHistory } from '@/api/virtual-lab-svc/queries/subscription';
import { tryCatch } from '@/api/utils';

export default async function History() {
  const { data, error } = await tryCatch(listUserSubscriptionsHistory(), undefined, {
    section: 'invoices-page',
    feature: 'list-user-subscription-history',
  });

  if (error) return <HistoryError />;

  if (!data || data.subscriptions.length === 0) return <HistoryEmpty />;

  const allPayments = flatMap(data.subscriptions, (subscription) =>
    subscription.payments
      .filter((payment) => !payment.is_standalone)
      .map((payment) => ({
        ...payment,
        subscription_id: subscription.id,
        subscription_type: subscription.subscription_type,
      }))
  );

  return (
    allPayments.length > 0 && (
      <div data-testid="payments-list" className="h-full w-full py-5">
        {/* this should be deleted */}
        <BillingTable payments={allPayments} loading={false} />
      </div>
    )
  );
}
