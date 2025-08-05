import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import flatMap from 'lodash/flatMap';

import { BillingTable } from '@/components/VirtualLab/create-entity-flows/subscription/billing-table';
import { listUserSubscriptionsHistory } from '@/api/virtual-lab-svc/queries/subscription';
import {
  HistoryEmpty,
  HistoryError,
} from '@/components/VirtualLab/create-entity-flows/subscription/elements';
import { keyBuilder } from '@/ui/queries/user';

export function Invoices() {
  const { data, isError, isLoading } = useQuery({
    queryKey: keyBuilder.invoices(),
    queryFn: listUserSubscriptionsHistory,
  });

  if (isLoading) return <LoadingOutlined spin />;
  if (isError) return <HistoryError />;

  const allPayments = flatMap(data?.subscriptions, (subscription) =>
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
        <BillingTable payments={allPayments} loading={isLoading} />
      </div>
    )
  );
}
