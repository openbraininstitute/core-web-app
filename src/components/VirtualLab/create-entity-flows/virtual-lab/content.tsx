'use client';

import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { useResetAtom } from 'jotai/utils';

import Subscription from '@/components/VirtualLab/create-entity-flows/virtual-lab/subscription';
import CreationForm from '@/components/VirtualLab/create-entity-flows/virtual-lab/form';
import { virtualLabFlowAtom } from '@/components/VirtualLab/create-entity-flows/virtual-lab/step-menu';
import { type VirtualLabFlowSteps } from '@/components/VirtualLab/create-entity-flows/common/types';

export default function Content() {
  const { push: navigate } = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [currentStep, setCurrentStep] = useAtom(virtualLabFlowAtom);
  const resetFlow = useResetAtom(virtualLabFlowAtom);

  const onStepChange = (t: VirtualLabFlowSteps) => setCurrentStep(t);
  const onCancel = () => navigate('/app/virtual-lab');

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    return () => resetFlow();
  }, [resetFlow]);

  if (!hydrated) return null;
  return (
    <>
      <CreationForm
        key="virtual-lab-creation-flow"
        step={currentStep}
        onCancel={onCancel}
        onStepChange={onStepChange}
      />
      <div className={currentStep !== 'payment' ? 'hidden' : ''}>
        <Subscription />
      </div>
    </>
  );
}
