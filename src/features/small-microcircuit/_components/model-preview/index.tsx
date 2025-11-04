import { match } from 'ts-pattern';

import { EntityTypeDict, IMEModel } from '@/api/entitycore/types';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { CircuitPreview } from '@/features/small-microcircuit/_components/model-preview/circuit-preview';
import { NeuronVisualizer } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/neuron-visualizer';

export default function ModelPreview({ model }: { model: ICircuit | IMEModel }) {
  const sessionId = crypto.randomUUID();

  return match(model.type)
    .with(EntityTypeDict.Circuit, () => <CircuitPreview circuit={model as ICircuit} />)
    .with(EntityTypeDict.Memodel, () => (
      <NeuronVisualizer memodelId={model.id} sessionId={sessionId} />
    ))
    .otherwise(() => null);
}
