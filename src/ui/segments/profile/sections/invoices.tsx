import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { flatMap } from 'es-toolkit/compat';

import { listUserSubscriptionsHistory } from '@/api/virtual-lab-svc/queries/subscription';
import { FileDownloadFill } from '@/components/icons/EditorIcons';
import { EmptyMinimal, ErrorMinimal } from '@/ui/molecules/feedback-card';
import { keyBuilder } from '@/ui/use-query-keys/user';
import { formatCurrency } from '@/utils/format';

import type { SubscriptionPaymentDetails } from '@/api/virtual-lab-svc/queries/types';

type InvoicePayment = SubscriptionPaymentDetails & {
  subscription_id: string;
  subscription_type: 'FREE' | 'PREMIUM' | 'PRO';
};

function getInvoiceObject(payment: InvoicePayment) {
  if (payment.subscription_type === 'PRO') return 'Pro';
  if (payment.subscription_type === 'PREMIUM') return 'Premium';
  return 'Free';
}

function getInvoiceDownloadUrl(payment: InvoicePayment) {
  return payment.invoice_pdf ?? payment.receipt_url;
}

function InvoiceCard({ payment }: { payment: InvoicePayment }) {
  const downloadUrl = getInvoiceDownloadUrl(payment);
  const period = `${format(new Date(payment.period_start), 'MMM dd')} - ${format(
    new Date(payment.period_end),
    'MMM dd, yyyy'
  )}`;

  return (
    <article className="rounded-2xl bg-white px-6 py-7 pb-3">
      <div className="grid grid-cols-2 gap-x-10 gap-y-1">
        <div>
          <p className="text-neutral-4 text-base">Object</p>
          <p className="text-primary-9 text-base font-bold">{getInvoiceObject(payment)}</p>
        </div>
        <div>
          <p className="text-neutral-4 text-base">Period</p>
          <p className="text-primary-9 text-base font-bold">{period}</p>
        </div>
        <div>
          <p className="text-neutral-4 text-base">Status</p>
          <p className="text-primary-9 text-base font-bold capitalize">{payment.status}</p>
        </div>
        <div>
          <p className="text-neutral-4 text-base">Payment method</p>
          <p
            className="text-primary-9 text-base font-bold"
            title={
              payment.card_brand && payment.card_last4
                ? `${payment.card_brand} **** ${payment.card_last4}`
                : undefined
            }
          >
            Credit card
          </p>
        </div>
        <div>
          <p className="text-neutral-4 text-base">Amount</p>
          <p className="text-primary-9 text-base font-bold">
            {formatCurrency(payment.amount_paid / 100, payment.currency)}
          </p>
        </div>
      </div>
      <div className="border-neutral-2 mt-5 flex justify-end border-t py-4 pb-2">
        {downloadUrl ? (
          <a
            className="text-primary-9 hover:text-primary-7 inline-flex items-center gap-3 text-lg font-bold"
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download <FileDownloadFill className="size-5" />
          </a>
        ) : (
          <span className="text-neutral-4 inline-flex items-center gap-3 text-lg font-bold">
            Download <FileDownloadFill className="size-5" />
          </span>
        )}
      </div>
    </article>
  );
}

export function Invoices() {
  const { data, isError, isLoading } = useQuery({
    queryKey: keyBuilder.invoices(),
    queryFn: listUserSubscriptionsHistory,
  });
  const allPayments = flatMap(data?.subscriptions, (subscription) =>
    subscription.payments
      .filter((payment) => !payment.is_standalone)
      .map((payment) => ({
        ...payment,
        subscription_id: subscription.id,
        subscription_type: subscription.subscription_type,
      }))
  ) as Array<InvoicePayment>;

  if (isLoading) {
    return (
      <div className="text-primary-9 flex h-40 items-center justify-center">
        <LoadingOutlined spin />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorMinimal
        title="Invoices error"
        description="We were unable to fetch your invoices history from our servers. Please refresh the page or try again later. if the issue persists, please contact support at support@openbraininstitute.org."
      />
    );
  }

  return (
    <div data-testid="payments-list" className="flex h-full w-full flex-col gap-5">
      {allPayments.map((payment) => (
        <InvoiceCard key={payment.id} payment={payment} />
      ))}
      {allPayments.length === 0 && (
        <EmptyMinimal
          tag="No invoices found"
          title="No invoices found"
          description="You have not made any payments yet."
        />
      )}
    </div>
  );
}
