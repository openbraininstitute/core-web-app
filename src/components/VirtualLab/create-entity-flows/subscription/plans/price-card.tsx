import { useState } from 'react';
import { motion } from 'framer-motion';
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

function SimplePricingCard({
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
    <motion.label
      layout
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={classNames(
        'relative flex w-full max-w-xs cursor-pointer flex-col items-center justify-center rounded-2xl bg-white p-6 text-center',
        'transition-all duration-300 ease-in-out',
        'shadow-md hover:shadow-lg',
        selectedInterval === interval && 'border-2 border-primary-8 shadow-lg'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      htmlFor={interval}
      onChange={() => onSelect(interval)}
    >
      <input
        hidden
        readOnly
        id={id}
        type="radio"
        name="billing_cycle"
        checked={selectedInterval === interval}
        value={interval}
      />
      {interval === 'yearly' && discount && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform rounded-full bg-gradient-to-r from-primary-8 to-primary-6 px-4 py-1 text-sm font-semibold text-white shadow-sm">
          save {discount}%
        </div>
      )}

      <h3 className="mb-3 text-2xl font-light text-primary-8">{title}</h3>

      <div className="mb-1 text-3xl font-bold text-primary-8 dark:text-white">
        {currency}
        {price}
      </div>

      <div className="mb-4 text-lg text-gray-600 dark:text-gray-300">{interval}</div>
    </motion.label>
  );
}

export default function PricingToggleCards() {
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly' | null>(null);

  const handleSelect = (id: 'monthly' | 'yearly') => setSelectedInterval(id);

  return (
    <div className="flex flex-col items-center justify-center bg-white py-10">
      <SimplePricingCard
        id="monthly"
        title="Pro Plan"
        price={40}
        currency="CHF"
        interval="monthly"
        selectedInterval={selectedInterval}
        onSelect={handleSelect}
      />
      <SimplePricingCard
        id="yearly"
        title="Pro Plan"
        price={250}
        currency="CHF"
        interval="yearly"
        discount={20}
        selectedInterval={selectedInterval}
        onSelect={handleSelect}
      />
    </div>
  );
}
