'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { useEffect } from 'react';

import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { LabTypeEnum } from '@/api/virtual-lab-svc/types';
import TiersList from '@/components/VirtualLab/create-entity-flows/checkout/tiers-list';
import { EmailVerificationWithBack } from '@/features/email-verification';
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
};

export function CheckoutFlow({ data }: Props) {
  const [flow, updateFlow] = useAtom(flowAtom);
  const queryClient = useQueryClient();

  const onPreviousStep = () => {
    updateFlow((prev) => ({ ...prev, step: FlowStepDict.Select, tier: null }));
  };

  const { data: virtualLabData } = useQuery({
    queryKey: keyBuilder.listAllLabs({ includes: [LabTypeEnum.MY_LAB] }),
    queryFn: async () => await listVirtualLabs({ include: [LabTypeEnum.MY_LAB] }),
  });

  const onVerificationComplete = async () => {
    await queryClient.invalidateQueries({
      queryKey: keyBuilder.listAllLabs({ includes: [LabTypeEnum.MY_LAB] }),
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
    <div className="relative flex h-full grow flex-col">
      <div className={flow.step !== FlowStepDict.Select ? 'hidden' : 'h-full'}>
        <TiersList subscriptionData={data} currentTier={data?.subscription.tier} />
      </div>
      <div className={flow.step !== FlowStepDict.EmailVerification ? 'hidden' : 'h-full'}>
        {virtualLabData?.data?.virtual_lab.id && (
          <EmailVerificationWithBack
            onBack={() => updateFlow({ ...flow, step: FlowStepDict.Select, tier: null })}
            virtualLabId={virtualLabData?.data?.virtual_lab.id}
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
