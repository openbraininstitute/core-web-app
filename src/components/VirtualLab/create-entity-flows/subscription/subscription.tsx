'use client';

import { useAtom } from 'jotai';
import { Dispatch, SetStateAction } from 'react';

import Plans from '@/components/VirtualLab/create-entity-flows/subscription/plans';
import PaymentForm from '@/components/VirtualLab/create-entity-flows/subscription/payment-form';

import { ContentForPricingPlan } from '@/components/LandingPage/content/pricing';
import { subscriptionFlowState } from '@/components/VirtualLab/create-entity-flows/subscription/flow-state';
import { type SubscriptionFlowSteps } from '@/components/VirtualLab/create-entity-flows/common/types';

type Props = {
  step: SubscriptionFlowSteps;
  onCancel: () => void;
  onStepChange: (step: SubscriptionFlowSteps) => void;
  onSlideDirectionChange: Dispatch<SetStateAction<'right' | 'left'>>;
};

export default function Subscription({
  step,
  onCancel,
  onStepChange,
  onSlideDirectionChange,
}: Props) {
  const [flowState, setFlowState] = useAtom(subscriptionFlowState);

  const onPreviousPlans = () => {
    onSlideDirectionChange('left');
    onStepChange('plans');
  };
  const onNextPayment = () => {
    onSlideDirectionChange('right');
    if (flowState?.plan?.title === 'Pro') onStepChange('payment');
    if (flowState?.plan?.title === 'Premium') onStepChange('contact-us');
  };

  const onSelectPlan = (plan: ContentForPricingPlan) => {
    setFlowState((prev) => ({
      ...prev,
      plan,
    }));
  };

  return (
    <div className="flex h-full flex-grow flex-col">
      <div
        className={
          step !== 'plans' ? 'hidden' : 'relative flex h-full flex-grow flex-col px-4 py-2'
        }
      >
        <Plans
          selectedPlan={flowState?.plan}
          onSelectPlan={onSelectPlan}
          onCancel={onCancel}
          onNextPayment={onNextPayment}
        />
      </div>
      <div
        className={
          step !== 'payment' // eslint-disable-line no-nested-ternary
            ? 'hidden'
            : flowState?.plan?.title === 'Pro' // eslint-disable-line no-nested-ternary
              ? 'relative flex h-full flex-grow flex-col px-4 py-2'
              : 'hidden'
        }
      >
        <PaymentForm
          virtualLabId="081b9eb8-a5e5-44eb-8815-bac492d4ef3c"
          onCancel={onCancel}
          onPrevious={onPreviousPlans}
          onStepChange={onStepChange}
        />
      </div>
    </div>
  );
}
