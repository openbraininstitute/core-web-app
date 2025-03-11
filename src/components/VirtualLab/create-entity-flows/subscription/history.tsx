import flatMap from 'lodash/flatMap';
import BillingTable from '@/components/VirtualLab/create-entity-flows/subscription/billing-table';
import {
  HistoryEmpty,
  HistoryError,
} from '@/components/VirtualLab/create-entity-flows/subscription/elements';
import { listUserSubscriptionsHistory } from '@/api/virtual-lab-svc/queries/subscription';
import { tryCatch } from '@/api/utils';

export default async function History() {
  const { data, error } = await tryCatch(listUserSubscriptionsHistory());

  if (error) return <HistoryError />;

  if (!data || data.subscriptions.length === 0) return <HistoryEmpty />;

  const allPayments = flatMap(data.subscriptions, (subscription) =>
    subscription.payments.map((payment) => ({
      ...payment,
      subscription_id: subscription.id,
    }))
  );

  return (
    <div className="h-full w-full py-5">
      {allPayments.length > 0 && <BillingTable payments={allPayments} />}
    </div>
  );
}
