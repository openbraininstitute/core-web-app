'use client';

import { useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';

import {
  ProjectFlowSteps,
  type Step,
} from '@/components/VirtualLab/create-entity-flows/common/types';
import BasicStepMenu, {
  createFlowAtom,
} from '@/components/VirtualLab/create-entity-flows//common/step-menu';

export const projectFlowAtom = createFlowAtom<ProjectFlowSteps>('virtual-lab');

export default function StepMenu({ steps }: { steps: Step[] }) {
  const setCurrentStep = useSetAtom(projectFlowAtom);
  const { virtualLabId } = useParams<{ virtualLabId: string }>();

  useEffect(() => {
    if (virtualLabId) setCurrentStep('information');
  }, [virtualLabId, setCurrentStep]);

  return <BasicStepMenu steps={steps} title="Project creation" flowAtom={projectFlowAtom} />;
}
