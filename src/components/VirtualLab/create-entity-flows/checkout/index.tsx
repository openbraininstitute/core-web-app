'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import type { UserActiveSubscriptionResponse } from '@/api/virtual-lab-svc/queries/types';
import PaymentForm from '@/components/VirtualLab/create-entity-flows/checkout/payment-form';
import { flowAtom } from '@/components/VirtualLab/create-entity-flows/checkout/shared';
import TiersList from '@/components/VirtualLab/create-entity-flows/checkout/tiers-list';

type Props = {
  data: UserActiveSubscriptionResponse | null;
};

export function CheckoutFlow({ data }: Props) {
  const [slideDirection, onSlideDirectionChange] = useState<'right' | 'left'>('right');
  const [flow, updateFlow] = useAtom(flowAtom);

  const onPreviousStep = () => {
    onSlideDirectionChange('right');
    updateFlow((prev) => ({ ...prev, step: 'select', tier: null }));
  };

  useEffect(() => {
    return () => {
      updateFlow(() => ({
        interval: 'month',
        step: 'select',
        tier: null,
        currency: 'chf',
      }));
    };
  }, [updateFlow]);

  return (
    <AnimatePresence initial={false} custom={slideDirection} mode="wait">
      <motion.div
        key={flow.step}
        custom={slideDirection}
        variants={{
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          duration: 0.3,
          type: 'tween',
          ease: 'easeInOut',
        }}
        className="relative flex h-full grow flex-col"
      >
        <div className={flow.step !== 'select' ? 'hidden' : 'h-full'}>
          <TiersList subscriptionData={data} currentTier={data?.subscription.tier} />
        </div>
        <div className={flow.step !== 'pay' ? 'hidden' : 'h-full'}>
          <PaymentForm onPrevious={onPreviousStep} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default CheckoutFlow;
