'use client';

import { useAtomValue } from 'jotai';
import reject from 'lodash/reject';

import BasicStepMenu, {
  createFlowAtom,
} from '@/components/VirtualLab/create-entity-flows/common/step-menu';
import {
  SubscriptionFlowSteps,
  type Step,
} from '@/components/VirtualLab/create-entity-flows/common/types';
import { subscriptionFlowState } from '@/components/VirtualLab/create-entity-flows/subscription/flow-state';

export const subscriptionLabFlowAtom = createFlowAtom<SubscriptionFlowSteps>('plans');

export default function SubscriptionStepMenu({ steps }: { steps: Step[] }) {
  const flowState = useAtomValue(subscriptionFlowState);

  let reducedSteps: Array<Step> = reject(steps, { id: 'contact-us' });

  if (flowState?.plan?.title === 'Free') {
    reducedSteps = reject(steps, (o) => o.id === 'contact-us' || o.id === 'payment');
  } else if (flowState?.plan?.title === 'Pro') {
    reducedSteps = reject(steps, (o) => o.id === 'contact-us');
  } else if (flowState?.plan?.title === 'Premium') {
    reducedSteps = reject(steps, (o) => o.id === 'members' || o.id === 'payment');
  }

  return (
    <BasicStepMenu
      steps={reducedSteps}
      title="Virtual lab creation"
      flowAtom={subscriptionLabFlowAtom}
    />
  );
}
