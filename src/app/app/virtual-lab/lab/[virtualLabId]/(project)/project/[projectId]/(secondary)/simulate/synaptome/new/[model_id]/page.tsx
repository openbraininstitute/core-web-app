import isNil from 'lodash/isNil';
import Container from '@/features/entities/neuron-simulation/experiment/containers';
import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { apiQueryExpand } from '@/entity-configuration/domain/model/single-neuron-synaptome';
import { tryCatch } from '@/api/utils';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

type Props = ServerSideComponentProp<
  WorkspaceContext & {
    model_id: string;
  },
  null
>;

async function loadExpandedSingleNeuronSynaptome({
  id,
  virtualLabId,
  projectId,
}: WorkspaceContext & { id: string }) {
  const { data: source, error } = await tryCatch(
    getSingleNeuronSynaptome({ id, context: { virtualLabId, projectId } })
  );

  if (error) {
    throw new Error('Failed to load single neuron synaptome entity details');
  }

  const { data: config, error: error1 } = await tryCatch(
    apiQueryExpand.config(source, { virtualLabId, projectId })
  );

  if (error1 || isNil(config)) {
    throw new Error('Failed to load single neuron synaptome relative data');
  }

  return {
    source,
    config,
  };
}

export default async function SynaptomeSimulation({ params: promisedParams }: Props) {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { virtualLabId, projectId, model_id } = await promisedParams;

  const payload = await loadExpandedSingleNeuronSynaptome({
    virtualLabId,
    projectId,
    id: model_id,
  });

  // const resetSimulation = useResetAtom(resetSimulationAtom);
  // useEffect(() => {
  //   return resetSimulation;
  // }, [resetSimulation]);

  return <Container payload={payload} type="synaptome-simulation" />;
}
