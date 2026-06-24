'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { useEffect } from 'react';

import { getSelfVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { TiersList } from '@/components/VirtualLab/create-entity-flows/checkout/tiers-list';
import { EmailVerification } from '@/features/email-verification';
import { flowAtom, SubscriptionPaymentForm } from '@/features/payments/subscription';
import {
  DefaultCurrency,
  FlowStepDict,
  IntervalDict,
} from '@/features/payments/subscription/shared';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { UserActiveSubscriptionResponse } from '@/api/virtual-lab-svc/queries/types';

type Props = {
  data: UserActiveSubscriptionResponse | null;
  onExpandedChange: ((expanded: boolean) => void) | undefined;
};

export function CheckoutFlow({ data, onExpandedChange }: Props) {
  const [flow, updateFlow] = useAtom(flowAtom);
  const queryClient = useQueryClient();

  const onPreviousStep = () => {
    updateFlow((prev) => ({ ...prev, step: FlowStepDict.Select, tier: null }));
  };

  const { data: virtualLabData } = useQuery({
    queryKey: keyBuilder.myLab(),
    queryFn: async () => await getSelfVirtualLab(),
  });

  const onVerificationComplete = async () => {
    await queryClient.invalidateQueries({
      queryKey: keyBuilder.myLab(),
    });
    updateFlow((prev) => ({ ...prev, step: FlowStepDict.Pay }));
  };

  useEffect(() => {
    return () => {
      updateFlow(() => ({
        interval: IntervalDict.Month,
        step: FlowStepDict.Select,
        tier: null,
        currency: DefaultCurrency,
      }));
    };
  }, [updateFlow]);

  return (
    <div className="relative flex h-full grow flex-col mt-3">
      <div className={flow.step !== FlowStepDict.Select ? 'hidden' : 'h-full'}>
        <TiersList
          subscriptionData={data}
          currentTier={data?.subscription.tier}
          onExpandedChange={onExpandedChange}
        />
      </div>

      <div
        className={
          flow.step !== FlowStepDict.EmailVerification ? 'hidden' : 'h-full p-10 max-w-3xl mx-auto'
        }
      >
        {virtualLabData?.data?.id && !virtualLabData.data.email_verified && (
          <EmailVerification
            virtualLabId={virtualLabData?.data?.id}
            onVerificationComplete={onVerificationComplete}
          />
        )}
      </div>
      <div className={flow.step !== FlowStepDict.Pay ? 'hidden' : 'h-full'}>
        <SubscriptionPaymentForm onPrevious={onPreviousStep} />
      </div>
    </div>
  );
}

export default CheckoutFlow;
