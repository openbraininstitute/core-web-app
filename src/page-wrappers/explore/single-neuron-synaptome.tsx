import Detail from '@/features/entities/single-neuron-synaptome/detail-view';

import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { getEModel, getMEModel, getReconstructionMorphology } from '@/api/entitycore/queries';
import { ModelTypeNames } from '@/entity-configuration/domain/model';
import { tryCatch } from '@/api/utils';

import type { WorkspaceContext } from '@/types/common';

type Props = WorkspaceContext & {
  id: string;
  modelType: ModelTypeNames;
};

// TODO: this is preparation for entitycore to add "expand" for memodel, synaptome
async function fetchSingleNeuronSynaptome({
  id,
  virtualLabId,
  projectId,
}: WorkspaceContext & { id: string }) {
  const synaptome = await getSingleNeuronSynaptome({ id, context: { virtualLabId, projectId } });
  const memodel = await getMEModel({
    id: synaptome.me_model.id,
    context: { virtualLabId, projectId },
  });
  const [emodel, morphology] = await Promise.all([
    getEModel({ id: memodel.emodel.id, context: { virtualLabId, projectId } }),
    getReconstructionMorphology({
      id: memodel.morphology.id,
      context: { virtualLabId, projectId },
    }),
  ]);

  return {
    memodel,
    emodel,
    morphology,
  };
}

export default async function Page(props: Props) {
  const { id, virtualLabId, projectId } = props;
  const { data, error } = await tryCatch(
    fetchSingleNeuronSynaptome({ id, virtualLabId, projectId })
  );
  if (error) {
    // TODO: fix the error page
    return <div>error </div>;
  }

  return (
    <Detail params={props} emodel={data.emodel} memodel={data.memodel} mmodel={data.morphology} />
  );
}
