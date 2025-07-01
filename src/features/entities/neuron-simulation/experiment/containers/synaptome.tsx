import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

import Configuration from '@/features/entities/neuron-simulation/experiment/setup/advanced-simulation-config';
import ActionButton from '@/features/entities/neuron-simulation/experiment/elements/simulate-button';
import { useSynaptomeSimulationConfig } from '@/state/simulate/categories';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type {
  ISingleNeuronSynaptome,
  TSingleNeuronSynaptomeConfiguration,
} from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { WorkspaceContext } from '@/types/common';
import type { Prettify } from '@/utils/type';

export type SingleNeuronSynaptomePayload = Prettify<{
  source: ISingleNeuronSynaptome;
  config: {
    synapses: Array<TSingleNeuronSynaptomeConfiguration>;
  };
}>;

const type = EntitySlug.SingleNeuronSynaptomeSimulation;

export default function Synaptome({
  payload,
  disable,
}: {
  payload: SingleNeuronSynaptomePayload;
  disable: boolean;
}) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext & { id: string }>();
  const { newConfig } = useSynaptomeSimulationConfig();
  const ref = useRef<boolean | null>(null);

  useEffect(() => {
    if (payload.config && !ref.current) {
      newConfig(payload.config.synapses);
      ref.current = true;
    }
  });

  return (
    <>
      <Configuration meModelId={payload.source.me_model.id} type={type} payload={payload} />
      <div className="fixed right-4 bottom-4 z-20 mt-auto">
        <ActionButton
          modelId={payload.source.id}
          meModelId={payload.source.me_model.id}
          virtualLabId={virtualLabId}
          projectId={projectId}
          simulationType={type}
          disable={disable}
        />
      </div>
    </>
  );
}
