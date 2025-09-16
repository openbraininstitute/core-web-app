import type { JSX } from 'react';

import StepTabs from '@/features/entities/neuron-simulation/experiment/elements/step-tabs';
import DefaultLoadingSuspense from '@/components/DefaultLoadingSuspense';

import type { SimulationType } from '@/types/small-scale-simulator/common';

type Props = {
  viewer: JSX.Element | null;
  children: React.ReactNode;
  type: SimulationType;
};

export default function Wrapper({ viewer, type, children }: Props) {
  return (
    <div className="h-screen w-full overflow-hidden">
      <StepTabs type={type} />
      <div className="flex h-[calc(100vh-42.5px)]">
        <div className="flex w-1/2 items-center justify-center bg-black">{viewer}</div>
        <div className="secondary-scrollbar mb-20 flex w-1/2 flex-col overflow-y-auto">
          <DefaultLoadingSuspense>{children}</DefaultLoadingSuspense>
        </div>
      </div>
    </div>
  );
}
