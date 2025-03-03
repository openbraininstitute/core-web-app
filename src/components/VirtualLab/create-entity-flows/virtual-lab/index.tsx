import Content from '@/components/VirtualLab/create-entity-flows/virtual-lab/content';
import StepMenu from '@/components/VirtualLab/create-entity-flows/virtual-lab/step-menu';
import { virtualLabFlowSteps } from '@/components/VirtualLab/create-entity-flows/common/types';
import { atom } from 'jotai';

const d = atom({
  information: null,
  plan: null,
  subscription: null,
})

export default function Flow() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <div className="mx-auto flex h-full w-full flex-grow flex-col">
        <div className="flex h-full w-full flex-grow flex-col">
          <StepMenu steps={virtualLabFlowSteps} />
          <Content />
        </div>
      </div>
    </div>
  );
}
