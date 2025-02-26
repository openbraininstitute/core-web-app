import reject from 'lodash/reject';

import Content from '@/components/VirtualLab/create-entity-flows/project/content';
import StepMenu from '@/components/VirtualLab/create-entity-flows/project/step-menu';
import { projectFlowSteps } from '@/components/VirtualLab/create-entity-flows/common/types';

type Props = { virtualLabId: string };

export default function Flow({ virtualLabId }: Props) {
  const steps = virtualLabId ? reject(projectFlowSteps, { id: 'virtual-lab' }) : projectFlowSteps;

  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <div className="mx-auto flex h-full  w-full flex-grow flex-col">
        <div className="flex h-full w-full flex-grow flex-col">
          <StepMenu steps={steps} />
          <Content />
        </div>
      </div>
    </div>
  );
}
