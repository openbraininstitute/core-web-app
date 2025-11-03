import { match } from 'ts-pattern';

import { EntityTypeDict, IMEModel } from '@/api/entitycore/types';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { CircuitPreview } from '@/features/small-microcircuit/_components/model-preview/circuit-preview';

export default function ModelPreview({ model }: { model: ICircuit | IMEModel }) {
  return match(model.type)
    .with(EntityTypeDict.Circuit, () => <CircuitPreview circuit={model as ICircuit} />)
    .with(EntityTypeDict.Memodel, () => <div>ME Model</div>)
    .otherwise(() => null);
}
