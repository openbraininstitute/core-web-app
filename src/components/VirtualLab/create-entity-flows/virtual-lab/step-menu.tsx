'use client';

import BasicStepMenu, {
  createFlowAtom,
} from '@/components/VirtualLab/create-entity-flows/common/step-menu';
import {
  VirtualLabFlowSteps,
  type Step,
} from '@/components/VirtualLab/create-entity-flows/common/types';

export const virtualLabFlowAtom = createFlowAtom<VirtualLabFlowSteps>('information');

export default function VirtualLabStepMenu({ steps }: { steps: Step[] }) {
  return <BasicStepMenu steps={steps} title="Virtual lab creation" flowAtom={virtualLabFlowAtom} />;
}
