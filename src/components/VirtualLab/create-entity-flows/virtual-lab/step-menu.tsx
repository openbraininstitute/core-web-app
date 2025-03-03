'use client';

import { useAtomValue } from 'jotai';
import { reject } from 'lodash';

import BasicStepMenu, {
  createFlowAtom,
} from '@/components/VirtualLab/create-entity-flows/common/step-menu';
import {
  VirtualLabFlowSteps,
  type Step,
} from '@/components/VirtualLab/create-entity-flows/common/types';
import { vlabFlowState } from '@/components/VirtualLab/create-entity-flows/virtual-lab/flow-state';

export const virtualLabFlowAtom = createFlowAtom<VirtualLabFlowSteps>('information');

export default function VirtualLabStepMenu({ steps }: { steps: Step[] }) {
  const flowState = useAtomValue(vlabFlowState);

  let reducedSteps: Array<Step> = reject(steps, { id: "contact-us" });

  if (flowState?.plan?.title === "Free") {
    reducedSteps = reject(steps, o => o.id === "contact-us" || o.id === "payment");
  }
  else if (flowState?.plan?.title === "Pro") {
    reducedSteps = reject(steps, o => o.id === "contact-us")
  }
  else if (flowState?.plan?.title === "Premium") {
    reducedSteps = reject(steps, o => o.id === "members" || o.id === "payment");
  }


  return <BasicStepMenu steps={reducedSteps} title="Virtual lab creation" flowAtom={virtualLabFlowAtom} />;
}
