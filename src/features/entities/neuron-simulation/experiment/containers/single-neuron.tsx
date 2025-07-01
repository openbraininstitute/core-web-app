import { useParams } from 'next/navigation';

import Configuration from '@/features/entities/neuron-simulation/experiment/setup/advanced-simulation-config';
import ActionsButton from '@/features/entities/neuron-simulation/experiment/elements/simulate-button';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { WorkspaceContext } from '@/types/common';

const type = EntitySlug.SingleNeuronSimulation;

function SingleNeuron({ disable }: { disable: boolean }) {
  const {
    virtualLabId,
    projectId,
    model_id: meModelId,
  } = useParams<WorkspaceContext & { model_id: string }>();
  return (
    <>
      <Configuration meModelId={meModelId} type={type} />
      <div className="fixed right-4 bottom-4 z-20 mt-auto">
        <ActionsButton
          modelId={meModelId}
          meModelId={meModelId}
          virtualLabId={virtualLabId}
          projectId={projectId}
          simulationType={type}
          disable={disable}
        />
      </div>
    </>
  );
}

export default SingleNeuron;
