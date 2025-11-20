import { match } from 'ts-pattern';
import { useAtomValue } from 'jotai';
import { modelAtomFamily } from '../atoms';

import { WorkspaceContext } from '@/types/common';

import { CircuitScaleDictionary, ICircuit } from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict, IMEModel } from '@/api/entitycore/types';

export function useModel({ id, context }: { id: string; context: WorkspaceContext }) {
  const modelAtom = modelAtomFamily({ id, context });
  const model = useAtomValue(modelAtom);

  return { model };
}

export function useApiUrl({ model }: { model: ICircuit | IMEModel }) {
  const apiPath = match(model)
    .with({ type: EntityTypeDict.Memodel }, () => 'me-model-simulation-scan-config-generate-grid')
    .with(
      { type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Single },
      () => 'me-model-with-synapses-circuit-simulation-scan-config-generate-grid'
    )
    .with({ type: EntityTypeDict.Circuit }, () => 'circuit-simulation-scan-config-generate-grid')
    .otherwise(() => {
      throw new Error(`Unsupported model type ${model.type}`);
    });
  return `${process.env.NEXT_PUBLIC_OBI_ONE_URL}/generated/${apiPath}`;
}
