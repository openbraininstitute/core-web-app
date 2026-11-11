import { CheckCircleFilled } from '@ant-design/icons';
import { domAnimation, LazyMotion, m } from 'framer-motion';
import { useAtom } from 'jotai';

import { flowAtom, type Interval } from '@/features/payments/subscription/shared';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

type Props = {
  id: string;
  title: ReactNode;
  price: number;
  currency: string;
  interval: Interval;
  discount?: number;
  selectedInterval: Interval | null;
  onSelect: (interval: Interval) => void;
};

function PricingCard({
  id,
  title,
  price,
  currency,
  interval,
  discount,
  selectedInterval,
  onSelect,
}: Props) {
  return (
    <m.button
      layout
      id={id}
      data-testid="price-card"
      onClick={() => onSelect(interval)}
      type="button"
      className={cn(
        'relative flex grow flex-col items-start rounded-2xl p-6',
        {
          'bg-primary-8 text-white! shadow-md border border-primary-8':
            selectedInterval === interval,
        },
        { 'text-primary-8 bg-white border border-gray-200': selectedInterval !== interval }
      )}
    >
      <div className="flex w-full items-center justify-between">
        <input
          hidden
          readOnly
          className="border-border-200 size-[22px] bg-transparent"
          type="radio"
          name="billing_cycle"
          checked={selectedInterval === interval}
          value={interval}
        />
      </div>
      <span className="flex items-center gap-2 text-2xl font-semibold">
        {title}
        {selectedInterval === interval && <CheckCircleFilled className="text-green-400!" />}
      </span>
      <span className="inline-block text-sm">
        <small className="mr-1 text-sm font-light">{currency}</small>
        <span className="text-xl font-semibold">
          {price}
          <span className="font-light">
            /<span className="text-sm font-light">{interval}</span>
          </span>
        </span>
      </span>
      {discount && (
        <div
          className={classNames(
            'text-primary-7 flex h-max items-center justify-center rounded-full bg-green-400 px-1 text-sm',
            'absolute top-2 right-4 p-1 px-3'
          )}
        >
          Save {discount}-
        </div>
      )}
    </m.button>
  );
}

export default function PricingToggleCards() {
  const [{ tier, interval }, updateFlowAtom] = useAtom(flowAtom);
  const handleSelect = (t: Interval) => updateFlowAtom((prev) => ({ ...prev, interval: t }));

  if (!tier) return null;

  return (
    <LazyMotion features={domAnimation}>
      <div
        data-testid="price-cards"
        className="flex w-full flex-row items-center justify-center gap-3"
      >
        {tier?.prices?.map((o) => (
          <PricingCard
            key={`${o.id}`}
            id={o.id}
            title={tier.title}
            price={o.discount / 100 || o.amount / 100}
            currency={o.currency}
            interval={o.interval}
            discount={o.discount / 100}
            selectedInterval={interval}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </LazyMotion>
  );
}
