'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useState } from 'react';

import { listStandalonePayments } from '@/api/virtual-lab-svc/queries/payment';
import { FileDownloadFill } from '@/components/icons';
import { formatMinorCurrency } from '@/features/stripe/utils';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { EmptyMinimal, ErrorMinimal } from '@/ui/molecules/feedback-card';
import { ListPagination } from '@/ui/molecules/list-pagination';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { SubscriptionPaymentDetails } from '@/api/virtual-lab-svc/queries/types';

const PAGE_SIZE = 4;

function getReceiptDownloadUrl(payment: SubscriptionPaymentDetails) {
  return payment.receipt_url ?? payment.invoice_pdf;
}

function PurchaseCard({ payment }: { payment: SubscriptionPaymentDetails }) {
  const downloadUrl = getReceiptDownloadUrl(payment);
  const purchaseDate = payment.payment_date
    ? format(new Date(payment.payment_date), 'MMM dd, yyyy')
    : 'N/A';
  const credits = payment.credits_purchased ?? 0;

  return (
    <article
      className={cn(
        'rounded-2xl border border-gray-200 bg-white px-4 py-4',
        'text-primary-9',
        'hover:bg-gray-50'
      )}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <p className="text-neutral-4 text-xs font-medium">Credits</p>
          <p className="text-primary-9 text-sm font-bold tabular-nums">
            {credits.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-neutral-4 text-xs font-medium">Purchase date</p>
          <p className="text-primary-9 text-sm font-bold">{purchaseDate}</p>
        </div>
        <div>
          <p className="text-neutral-4 text-xs font-medium">Subtotal</p>
          <p className="text-primary-9 text-sm font-bold">
            {formatMinorCurrency(
              payment.amount_subtotal ?? payment.amount_paid ?? payment.amount_total ?? 0,
              payment.currency
            )}
          </p>
        </div>
        <div>
          <p className="text-neutral-4 text-xs font-medium">VAT</p>
          <p className="text-primary-9 text-sm font-bold">
            {formatMinorCurrency(payment.amount_tax ?? 0, payment.currency)}
          </p>
        </div>
        <div>
          <p className="text-neutral-4 text-xs font-medium">Total</p>
          <p className="text-primary-9 text-sm font-bold">
            {formatMinorCurrency(
              payment.amount_total ?? payment.amount_paid ?? 0,
              payment.currency
            )}
          </p>
        </div>
        <div>
          <p className="text-neutral-4 text-xs font-medium">Status</p>
          <p className="text-primary-9 text-sm font-bold capitalize">{payment.status}</p>
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
            Receipt <FileDownloadFill className="size-4" />
          </a>
        ) : (
          <span className="text-neutral-4 inline-flex items-center gap-2 text-sm font-bold">
            Receipt <FileDownloadFill className="size-4" />
          </span>
        )}
      </div>
    </article>
  );
}

export function PurchasesHistory({ virtualLabId }: { virtualLabId: string }) {
  const [page, setPage] = useState(1);
  const { isVirtualLabAdmin: isAdmin } = useWorkspaceMembership({ virtualLabId });

  const { data, error, isLoading } = useQuery({
    queryKey: keyBuilder.purchases({ virtualLabId, page, pageSize: PAGE_SIZE }),
    queryFn: () =>
      listStandalonePayments({
        virtualLabId,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const purchases = data?.data?.payments ?? [];
  const totalItems = data?.data?.total_count ?? 0;

  if (!isAdmin) {
    return (
      <ErrorMinimal
        tag="Access Denied"
        title="You are not authorized to view this section"
        description="You are not authorized to view this section. You may need additional access to view this content. Please contact the virtual lab administrator for help."
        classNames={{
          container: 'border border-gray-100 rounded-2xl',
        }}
      />
    );
  }

  if (error) {
    return (
      <ErrorMinimal
        title="Payment history error"
        description={
          <p>
            We encountered an issue while retrieving your payment history. Please try again later or
            contact support at{' '}
            <a href="mailto:support@openbraininstitute.org">support@openbraininstitute.org</a>.
          </p>
        }
        classNames={{
          container: 'border border-gray-100 rounded-2xl',
        }}
      />
    );
  }

  return (
    <div
      id="purchases-history-list"
      data-testid="purchases-history-list"
      className="flex h-full min-h-0 w-full flex-1 flex-col"
    >
      <div
        className={cn(
          'secondary-scrollbar flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1'
        )}
      >
        {isLoading ? (
          <div className="text-primary-9 flex min-h-0 flex-1 items-center justify-center">
            <LoadingOutlined spin className="text-2xl" />
          </div>
        ) : purchases.length === 0 ? (
          <EmptyMinimal
            title="No purchases yet"
            description="You have not made any purchases yet."
            classNames={{
              container: 'border border-gray-100 rounded-2xl',
            }}
          />
        ) : (
          purchases.map((payment) => <PurchaseCard key={payment.id} payment={payment} />)
        )}
      </div>
      <ListPagination current={page} pageSize={PAGE_SIZE} total={totalItems} onChange={setPage} />
    </div>
  );
}
