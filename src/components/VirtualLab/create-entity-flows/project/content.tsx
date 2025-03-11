'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAtom } from 'jotai';
import { useResetAtom } from 'jotai/utils';

import CreationForm from '@/components/VirtualLab/create-entity-flows/project/form';
import { projectFlowAtom } from '@/components/VirtualLab/create-entity-flows/project/step-menu';
import type {
  ProjectFlowSteps,
  ProjectFlowStepsArray,
} from '@/components/VirtualLab/create-entity-flows/common/types';

export default function Content({ steps }: { steps: ProjectFlowStepsArray }) {
  const resetFlow = useResetAtom(projectFlowAtom);
  const { push: navigate } = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [currentStep, setCurrentStep] = useAtom(projectFlowAtom);
  const { virtualLabId } = useParams<{ virtualLabId: string }>();

  const onStepChange = (t: ProjectFlowSteps) => setCurrentStep(t);

  const onCancel = () => {
    if (virtualLabId) navigate(`/app/virtual-lab/lab/${virtualLabId}/overview`);
    else navigate('/app/virtual-lab');
  };

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    return () => resetFlow();
  }, [resetFlow]);

  if (!hydrated) return null;
  return (
    <CreationForm
      key="project-creation-flow"
      step={currentStep}
      steps={steps}
      onCancel={onCancel}
      onStepChange={onStepChange}
    />
  );
}
