import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { motion } from 'framer-motion';

import { flowAtom } from '@/components/VirtualLab/create-entity-flows/checkout/shared';
import { classNames } from '@/util/utils';

interface Props {
  id: string;
  title: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  discount?: number;
  selectedInterval: 'monthly' | 'yearly' | null;
  onSelect: (id: 'monthly' | 'yearly') => void;
}


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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onChange={() => onSelect(interval)}
      type="button"
      className="relative border-0.5 flex flex-grow flex-col rounded-lg p-4 items-start bg-white border-gray-100"
    >
      <div className="flex w-full items-center justify-between">
        <input
          hidden
          readOnly
          className="border-border-200 h-[22px] w-[22px] bg-transparent"
          type="radio"
          name='billing_cycle'
          checked={selectedInterval === interval}
          value={interval}
        />
      </div>
      <span className="text-primary-8 font-bold text-xl">{title}</span>
      <span className="text-primary-8 inline-block text-sm">
        <small className='font-light text-sm mr-1'>{currency}</small>
        <span className='font-bold text-xl'>{price}</span>
      </span>
      {discount && (
        <div className={classNames(
          "text-primary-8 bg-blue-400 flex h-max items-center justify-center rounded-full bg-opacity-10 px-1 text-sm",
          "absolute right-4 top-2 px-3 p-1"
        )}>
          Save 10%
        </div>
      )}
    </motion.button>
  );
}

export default function PricingToggleCards() {
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly' | null>(null);
  const { selectedPlan } = useAtomValue(flowAtom);
  const handleSelect = (id: 'monthly' | 'yearly') => setSelectedInterval(id);

  if (!selectedPlan) return null;
  return (
    <div className="flex flex-row gap-3 items-center justify-center pb-4 w-full">
      {Object.entries(selectedPlan.price).map(([price, details], catIdx) => (
        <PricingCard
          id={price}
          discount={details.discount}
          title={selectedPlan.title}
          price={details.value!}
          currency={details.currency!}
          interval={price === "month" ? "monthly" : "yearly"}
          selectedInterval={selectedInterval}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}

