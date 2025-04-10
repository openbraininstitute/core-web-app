'use client';

import { useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';

import { ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import {
  ProjectFlowSteps,
  type Step,
} from '@/components/VirtualLab/create-entity-flows/common/types';
import BasicStepMenu, {
  createFlowAtom,
} from '@/components/VirtualLab/create-entity-flows//common/step-menu';

export const projectFlowAtom = createFlowAtom<ProjectFlowSteps>('virtual-lab');

const Title = (
  <div className="flex items-center justify-center gap-3">
    <Link href="/app/virtual-lab" className="text-xl font-bold text-white">
      <ArrowLeftOutlined />
    </Link>
    <div className="flex grow justify-center text-white">
      <h1 className="text-2xl font-bold tracking-wide uppercase select-none">Project creation</h1>
    </div>
  </div>
);

export default function StepMenu({ steps }: { steps: Step[] }) {
  const setCurrentStep = useSetAtom(projectFlowAtom);
  const { virtualLabId } = useParams<{ virtualLabId: string }>();

  useEffect(() => {
    if (virtualLabId) setCurrentStep('information');
  }, [virtualLabId, setCurrentStep]);

  return <BasicStepMenu steps={steps} title={Title} flowAtom={projectFlowAtom} />;
}
