import Detail from '@/features/entities/single-neuron-synaptome/detail-view';

import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { SingleNeuronSynaptome } from '@/entity-configuration/domain/model';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { ErrorComponent } from '@/components/GenericErrorFallback';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getAssetElement } from '@/api/entitycore/utils';
import { getMEModel } from '@/api/entitycore/queries';
import { arrayBufferToJson } from '@/utils/buffer';
import { tryCatch } from '@/api/utils';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  params: WorkspaceContext & {
    id: string;
  };
};

// TODO: this is preparation for entitycore to expand memodel within synaptome
async function fetchSingleNeuronSynaptome({ id, virtualLabId, projectId }: Props['params']) {
  let config: {
    synapses: Array<TSingleNeuronSynaptomeConfiguration>;
  } | null = null;
  const { data, error } = await tryCatch(
    getSingleNeuronSynaptome({ id, context: { virtualLabId, projectId } })
  );

  if (error) {
    throw new Error('Single neuron synaptome could not be found');
  }

  const { data: memodel, error: err1 } = await tryCatch(
    getMEModel({
      id: data.me_model.id,
      context: { virtualLabId, projectId },
    })
  );

  if (err1) {
    throw new Error('Single neuron model could not be found');
  }

  const configAsset = getAssetElement({
    assets: data.assets,
    path: `${SingleNeuronSynaptome.asset.configfile}_${data.id}.json`,
    type: SingleNeuronSynaptome.asset.extension!,
  });

  if (!configAsset) {
    throw new Error('No Single Neuron Synaptome configuration found');
  }

  const { data: asset, error: err2 } = await tryCatch(
    downloadAsset({
      ctx: { virtualLabId, projectId },
      entityId: data.id,
      entityType: EntityTypeEnum.SingleNeuronSynaptome,
      id: configAsset.id,
    })
  );

  if (err2) {
    throw new Error('Could not read the single neuron configuration file');
  }
  config = arrayBufferToJson(asset);

  return {
    entity: data,
    memodel,
    config,
  };
}

export default async function Page({ params }: Props) {
  const { id, virtualLabId, projectId } = params;
  const { data, error } = await tryCatch(
    fetchSingleNeuronSynaptome({ virtualLabId, projectId, id })
  );

  if (error) {
    return <ErrorComponent error={error} />;
  }

  return (
    <Detail params={{ virtualLabId, projectId, id }} memodel={data.memodel} config={data.config} />
  );
}
