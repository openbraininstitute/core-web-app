'use client';

import { useQuery } from '@tanstack/react-query';

import { adminQueryKeys } from '../../../query-keys';
import { Detail, DetailList } from '../../../shared/detail-list';
import { formatDateTime } from '../../../shared/format';
import { Loaded } from '../../../shared/load-state';
import { PageHeader } from '../../../shared/page-header';
import { AdminLink } from '../../../shell/admin-link';
import { CapabilityGate } from '../../../shell/capability-gate';
import { getPrice } from '../api';
import { accountingHref, priceAt, SERVICE_TYPE_LABELS, windowStatus } from '../helpers';
import { AccountingPage, WindowStatus } from '../types';
import { WindowStatusPill } from './cells';
import { PriceActions } from './price-actions';
import { CostExamples, PriceTiersTable } from './price-parts';
import { usePricesFor } from './queries';

import type { TPrice } from '../types';

function InUse({ price }: { price: TPrice }) {
  const prices = usePricesFor(price);
  if (prices.isPending || prices.isError) return null;
  const current = priceAt(prices.data.data, new Date());
  if (!current) return null;
  if (current.id === price.id) return <span className="text-neutral-4">In use now</span>;
  return (
    <span className="text-neutral-4">
      Not in use:{' '}
      <AdminLink kind="accountingPrice" id={String(current.id)} label={`price #${current.id}`} />{' '}
      applies instead
    </span>
  );
}

function PriceView({ price }: { price: TPrice }) {
  return (
    <>
      <PageHeader
        title={`Price #${price.id}`}
        parent={{ label: 'Prices', href: accountingHref(AccountingPage.Prices) }}
        actions={
          <CapabilityGate need="accounting.write">
            <PriceActions price={price} />
          </CapabilityGate>
        }
      />
      <DetailList>
        <Detail label="Service">
          {SERVICE_TYPE_LABELS[price.service_type]} · {price.service_subtype}
        </Detail>
        <Detail label="Applies to">
          {price.vlab_id ? (
            <AdminLink kind="account" id={price.vlab_id} />
          ) : (
            'Every lab without its own price'
          )}
        </Detail>
        <Detail label="Status">
          <span className="flex flex-wrap items-center gap-3">
            <WindowStatusPill window={price} />
            {windowStatus(price) === WindowStatus.Active && <InUse price={price} />}
          </span>
        </Detail>
        <Detail label="Starts">{formatDateTime(price.valid_from)}</Detail>
        <Detail label="Ends">{price.valid_to ? formatDateTime(price.valid_to) : 'No end'}</Detail>
        <Detail label="Created">{formatDateTime(price.created_at)}</Detail>
        <Detail label="Updated">{formatDateTime(price.updated_at)}</Detail>
      </DetailList>
      <h2 className="text-primary-9 font-semibold">Tiers</h2>
      <PriceTiersTable pricing={price} />
      <h2 className="text-primary-9 font-semibold">Cost before any lab discount</h2>
      <div className="border-neutral-2 max-w-xl rounded-lg border bg-white p-4">
        <CostExamples pricing={price} />
      </div>
    </>
  );
}

export function PriceDetail({ priceId }: { priceId: number }) {
  const query = useQuery({
    queryKey: adminQueryKeys.accountingPrice(priceId),
    queryFn: ({ signal }) => getPrice(priceId, signal),
  });

  return (
    <div className="flex flex-col gap-4">
      <Loaded query={query} what="the price">
        {(price) => <PriceView price={price} />}
      </Loaded>
    </div>
  );
}
