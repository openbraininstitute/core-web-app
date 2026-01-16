import { useAtom } from 'jotai';
import { motion } from 'framer-motion';

import { ReactNode } from 'react';
import { flowAtom, Interval } from '@/components/VirtualLab/create-entity-flows/checkout/shared';
import { classNames } from '@/util/utils';

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
    <motion.button
      layout
      id={id}
      data-testid="price-card"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => onSelect(interval)}
      type="button"
      className={classNames(
        'border-0.5 border relative flex grow flex-col items-start rounded-lg  p-6 bg-primary-8',
        selectedInterval === interval ? 'text-white border-green-400!' : ' text-primary-3 border-primary-8'
      )}
    >
      <div className="flex w-full items-center justify-between">
        <input
          hidden
          readOnly
          className="border-border-200 h-[22px] w-[22px] bg-transparent"
          type="radio"
          name="billing_cycle"
          checked={selectedInterval === interval}
          value={interval}
        />
      </div>
      <span className="text-3xl font-bold capitalize">{interval}</span>
      <span className="inline-block text-sm">
        <small className="mr-1 text-sm font-light">{currency}</small>
        <span className="text-xl font-bold">
          {price}
          <span className="font-light">
            /<span className="text-sm font-light">{interval}</span>
          </span>
        </span>
      </span>
      {discount && (
        <div
          className={classNames(
            'text-primary-7 flex h-max items-center justify-center rounded-full  px-1 text-sm',
            'absolute top-2 right-4 p-1 px-3',
            selectedInterval === interval ? 'bg-green-400' : 'bg-primary-3'
          )}
        >
          Save {discount}-
        </div>
      )}
    </motion.button>
  );
}

export default function PricingToggleCards() {
  const [{ tier, interval }, updateFlowAtom] = useAtom(flowAtom);
  const handleSelect = (t: Interval) => updateFlowAtom((prev) => ({ ...prev, interval: t }));

  if (!tier) return null;

  return (
    <div
      data-testid="price-cards"
      className="flex w-full flex-row items-center justify-center gap-3 pb-4"
    >
      {tier?.prices &&
        tier.prices.map((o) => (
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
  );
}
