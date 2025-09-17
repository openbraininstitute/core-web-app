import type { Metadata } from 'next';

import some from 'lodash/some';
import startsWith from 'lodash/startsWith';
import Configuration from '@/page-wrappers/build/single-neuron-synaptome';

import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { SingleNeuronSynaptome } from '@/entity-configuration/domain/model/single-neuron-synaptome';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ErrorComponent } from '@/components/GenericErrorFallback';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getAssetElement } from '@/api/entitycore/utils';
import { tryCatch } from '@/api/utils';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

type Props = ServerSideComponentProp<WorkspaceContext, { mode: 'clone'; model: string; s: string }>;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const searchParams = await props.searchParams;
  let title = 'Single Neuron Synaptome';
  let description = 'Create a new single neuron synaptome';

  if (searchParams.mode === 'clone' && searchParams.model) {
    const { data, error } = await tryCatch(
      getSingleNeuronSynaptome({
        id: searchParams.model,
        context: params,
      })
    );
    if (error) {
      title = 'Error Cloning Single Neuron Synaptome';
      description = 'An error occurred while cloning the single neuron synaptome.';
    }
    title = `Clone Single Neuron Synaptome (${data?.name})`;
    description = `Clone the single neuron synaptome ${data?.name}`;
  }

  return {
    title,
    description,
  };
}

async function getSingleNeuronSynaptomeConfiguration({
  ctx,
  mode,
  model,
}: {
  ctx: WorkspaceContext;
  mode: 'clone';
  model: string;
}) {
  if (mode === 'clone' && model) {
    const data = await getSingleNeuronSynaptome({
      id: model,
      context: ctx,
    });
    const configAsset = getAssetElement({
      assets: data.assets,
      filter: (i) => {
        return (
          i.label === SingleNeuronSynaptome.asset.configfile ||
          some(['single_neuron_synaptome_config', 'synaptome_config'], (prefix) =>
            startsWith(i.path, prefix)
          )
        );
      },
    });

    if (!configAsset) {
      throw new Error('No Single Neuron Synaptome configuration found');
    }

    const asset = await downloadAsset({
      ctx,
      entityId: data.id,
      entityType: EntityTypeDict.SingleNeuronSynaptome,
      id: configAsset.id,
    });

    return {
      entity: data,
      config: asset,
    };
  }

  return null;
}

export default async function Page({
  params: promisedParams,
  searchParams: promisedSearchParams,
}: Props) {
  const params = await promisedParams;
  const searchParams = await promisedSearchParams;
  const stateId = searchParams.s ?? crypto.randomUUID();

  const { data, error } = await tryCatch(
    getSingleNeuronSynaptomeConfiguration({
      ctx: params,
      mode: searchParams.mode,
      model: searchParams.model,
    })
  );

  if (error) {
    return <ErrorComponent error={error} />;
  }

  const phase = data?.entity && data.config ? 'me-model' : 'basic';

  return (
    <Configuration
      stateId={stateId}
      origin={{
        entity: data?.entity,
        config: data?.config,
      }}
      virtualLabId={params.virtualLabId}
      projectId={params.projectId}
      phase={phase}
    />
  );
}
