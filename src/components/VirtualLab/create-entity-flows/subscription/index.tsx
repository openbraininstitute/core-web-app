'use client';

import { useEffect, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { useResetAtom } from 'jotai/utils';
import { ConfigProvider } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';

import Subscription from '@/components/VirtualLab/create-entity-flows/subscription/subscription';
import ContactUs from '@/components/VirtualLab/create-entity-flows/subscription/contact-us-form';

import { subscriptionLabFlowAtom } from '@/components/VirtualLab/create-entity-flows/subscription/step-menu';
import { subscriptionFlowState } from '@/components/VirtualLab/create-entity-flows/subscription/flow-state';
import { type SubscriptionFlowSteps } from '@/components/VirtualLab/create-entity-flows/common/types';

export default function Content() {
  const { push: navigate } = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [step, setCurrentStep] = useAtom(subscriptionLabFlowAtom);
  const resetFlow = useResetAtom(subscriptionLabFlowAtom);
  const resetFlowState = useSetAtom(subscriptionFlowState);

  const [slideDirection, onSlideDirectionChange] = useState<'right' | 'left'>('right');
  const onStepChange = (t: SubscriptionFlowSteps) => setCurrentStep(t);
  const onCancel = () => {
    resetFlowState(null);
    navigate('/app/virtual-lab');
  };

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    return () => {
      resetFlow();
      resetFlowState(null);
    };
  }, [resetFlow, resetFlowState]);

  if (!hydrated) return null;
  return (
    <ConfigProvider theme={{ hashed: false }}>
      <AnimatePresence initial={false} custom={slideDirection} mode="wait">
        <motion.div
          key={step}
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
          className="relative flex h-full flex-grow flex-col"
        >
          <div
            className={
              step !== 'payment' && step !== 'plans' ? 'hidden' : 'flex h-full flex-grow flex-col'
            }
          >
            <Subscription {...{ step, onCancel, onStepChange, onSlideDirectionChange }} />
          </div>
          <div className={step !== 'contact-us' ? 'hidden' : 'flex h-full flex-grow flex-col'}>
            <ContactUs {...{ step, onCancel, onStepChange, onSlideDirectionChange }} />
          </div>
        </motion.div>
      </AnimatePresence>
    </ConfigProvider>
  );
}
