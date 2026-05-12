import { formatMinorCurrency } from '@/features/stripe/utils';
import { cn } from '@/utils/css-class';

import type {
  BillingQuoteResponse,
  CreditConversionResponse,
} from '@/api/virtual-lab-svc/queries/types';

export function BillingSummary({
  quote,
  conversion,
  loading = false,
  title = 'Order details',
}: {
  quote: BillingQuoteResponse | null;
  conversion?: CreditConversionResponse | null;
  loading?: boolean;
  title?: string;
}) {
  const subtotal = quote?.subtotal ?? conversion?.amount ?? 0;
  const currency = quote?.currency ?? conversion?.currency ?? 'chf';

  const taxAmount = quote?.tax_amount ?? 0;
  const total = quote?.total ?? subtotal;
  const taxCountry = quote?.tax_country;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white/5 p-4 text-sm text-primary-9">
      <div className="mb-4 font-bold">{title}</div>
      <div className="flex justify-between gap-4">
        <span>Subtotal excl. VAT</span>
        <BillingAmount loading={loading} value={formatMinorCurrency(subtotal, currency)} />
      </div>
      <div className="mt-2 flex justify-between gap-4">
        <span>VAT{taxCountry === 'CH' ? ' (CH)' : ''}</span>
        <BillingAmount loading={loading} value={formatMinorCurrency(taxAmount, currency)} />
      </div>
      <div className="mt-3 flex justify-between gap-4 border-t border-gray-200 pt-3 font-semibold">
        <span>Total due today</span>
        <BillingAmount loading={loading} value={formatMinorCurrency(total, currency)} wide />
      </div>
      {taxCountry === 'CH' && <div className="text-xs text-gray-400">Incl. VAT (CH)</div>}
    </div>
  );
}

function BillingAmount({
  loading,
  value,
  wide = false,
}: {
  loading: boolean;
  value: string;
  wide?: boolean;
}) {
  if (loading) {
    return (
      <span
        title="Calculating"
        className={cn('h-4 rounded-full animate-pulse bg-gray-100', wide ? 'w-24' : 'w-20')}
      />
    );
  }

  return <span className="font-bold">{value}</span>;
}
