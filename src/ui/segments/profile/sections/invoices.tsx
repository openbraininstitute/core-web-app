'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';

import { listUserSubscriptionInvoicePayments } from '@/api/virtual-lab-svc/queries/payment';
import { FileDownloadFill } from '@/components/icons/EditorIcons';
import { EmptyMinimal, ErrorMinimal } from '@/ui/molecules/feedback-card';
import { ListPagination } from '@/ui/molecules/list-pagination';
import { keyBuilder } from '@/ui/use-query-keys/user';
import { cn } from '@/utils/css-class';
import { formatCurrency } from '@/utils/format';

import type { SubscriptionPaymentDetails } from '@/api/virtual-lab-svc/queries/types';

const PAGE_SIZE = 4;

type InvoicePayment = SubscriptionPaymentDetails & {
  subscription_id?: string;
  subscription_type?: 'FREE' | 'PREMIUM' | 'PRO';
};

function getInvoiceObject(payment: InvoicePayment) {
  if (payment.subscription_type === 'PRO') return 'Pro';
  if (payment.subscription_type === 'PREMIUM') return 'Premium';
  if (payment.subscription_type === 'FREE') return 'Free';
  return 'Subscription';
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
    <article
      className={cn(
        'rounded-2xl border border-gray-200 bg-white px-4 py-4',
        'text-primary-9',
        'hover:bg-gray-50'
      )}
    >
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
      <div className="border-neutral-2 mt-3 flex justify-end border-t pt-3">
        {downloadUrl ? (
          <a
            className="text-primary-9 hover:text-primary-7 inline-flex items-center gap-2 text-sm font-bold"
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
  const [page, setPage] = useState(1);

  const { data, error, isLoading } = useQuery({
    queryKey: keyBuilder.invoicesPaginated({ page, pageSize: PAGE_SIZE }),
    queryFn: () =>
      listUserSubscriptionInvoicePayments({
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const payments = useMemo(() => {
    const rows = (data?.data?.payments ?? []).filter((payment) => !payment.is_standalone);
    return rows as InvoicePayment[];
  }, [data?.data?.payments]);
  const totalItems = data?.data?.total_count ?? 0;

  if (error) {
    return (
      <ErrorMinimal
        title="Invoices error"
        description="We were unable to fetch your invoices history from our servers. Please refresh the page or try again later. if the issue persists, please contact support at support@openbraininstitute.org."
      />
    );
  }

  return (
    <div data-testid="payments-list" className="flex min-h-0 w-full flex-1 flex-col gap-5">
      <div
        className={cn(
          'secondary-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1'
        )}
      >
        {isLoading ? (
          <div className="text-primary-9 flex min-h-32 flex-1 items-center justify-center">
            <LoadingOutlined spin />
          </div>
        ) : payments.length === 0 ? (
          <EmptyMinimal
            title="No invoices found"
            description="You have not made any payments yet."
          />
        ) : (
          payments.map((payment) => <InvoiceCard key={payment.id} payment={payment} />)
        )}
      </div>
      <ListPagination current={page} pageSize={PAGE_SIZE} total={totalItems} onChange={setPage} />
    </div>
  );
}
