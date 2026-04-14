'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { useEffect } from 'react';

import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { LabTypeEnum } from '@/api/virtual-lab-svc/types';
import PaymentForm from '@/components/VirtualLab/create-entity-flows/checkout/payment-form';
import { flowAtom } from '@/components/VirtualLab/create-entity-flows/checkout/shared';
import TiersList from '@/components/VirtualLab/create-entity-flows/checkout/tiers-list';
import {
  EmailVerification,
  EmailVerificationWithBack,
} from '@/ui/segments/virtual-lab-settings/elements/email-verification';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { UserActiveSubscriptionResponse } from '@/api/virtual-lab-svc/queries/types';

type Props = {
  data: UserActiveSubscriptionResponse | null;
};

export function CheckoutFlow({ data }: Props) {
  const [flow, updateFlow] = useAtom(flowAtom);
  const queryClient = useQueryClient();

  const onPreviousStep = () => {
    updateFlow((prev) => ({ ...prev, step: 'select', tier: null }));
  };

  const { data: virtualLabData } = useQuery({
    queryKey: keyBuilder.listAllLabs({ includes: [LabTypeEnum.MY_LAB] }),
    queryFn: async () => await listVirtualLabs({ include: [LabTypeEnum.MY_LAB] }),
  });

  const onVerificationComplete = async () => {
    await queryClient.invalidateQueries({
      queryKey: keyBuilder.listAllLabs({ includes: [LabTypeEnum.MY_LAB] }),
    });
    updateFlow((prev) => ({ ...prev, step: 'pay' }));
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
    <div className="relative flex h-full grow flex-col">
      <div className={flow.step !== 'select' ? 'hidden' : 'h-full'}>
        <TiersList subscriptionData={data} currentTier={data?.subscription.tier} />
      </div>
      <div className={flow.step !== 'email-verification' ? 'hidden' : 'h-full'}>
        {virtualLabData?.data?.virtual_lab.id && (
          <EmailVerificationWithBack
            onBack={() => updateFlow({ ...flow, step: 'select', tier: null })}
            virtualLabId={virtualLabData?.data?.virtual_lab.id}
            onVerificationComplete={onVerificationComplete}
          />
        )}
      </div>
      <div className={flow.step !== 'pay' ? 'hidden' : 'h-full'}>
        <PaymentForm onPrevious={onPreviousStep} />
      </div>
    </div>
  );
}

export default CheckoutFlow;
