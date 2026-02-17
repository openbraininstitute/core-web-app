import isNil from 'es-toolkit/compat/isNil';
import { notFound } from 'next/navigation';

import { getCellMorphology } from '@/api/entitycore/queries';
import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { tryCatch } from '@/api/utils';
import SimulationConfigurationTab from '@/components/simulate/SimulationDetails/configuration-tab';
import {
  applyEntityExpansions,
  type EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';
import { SingleNeuronSynaptome as singleNeuronSynaptomeEntity } from '@/entity-configuration/domain/model/single-neuron-synaptome';
import {
  singleNeuronSimulationApiQueryExpand,
  singleNeuronSynaptomeSimulationApiQueryExpand,
} from '@/entity-configuration/domain/simulation';
import EModelConfig from '@/features/entities/e-model/detail-view/wrapper';
import MEModelConfig from '@/features/entities/me-model/detail-view/configuration';
import SynaptomeConfig from '@/features/entities/single-neuron-synaptome/detail-view/configuration';
import SynapseGroupList from '@/features/entities/single-neuron-synaptome/detail-view/elements/list-synapses-configuration';

import type {
  ICellMorphology,
  ICellMorphologyExpanded,
  IEModel,
  IMEModel,
  ISingleNeuronSimulation,
  ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types';
import type {
  ISingleNeuronSynaptome,
  TSingleNeuronSynaptomeConfiguration,
} from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { EntityTypeValue } from '@/entity-configuration/domain';
import type { AwaitedType, WorkspaceContext } from '@/types/common';
import type { SimulationPayload } from '@/types/small-scale-simulator/single-neuron';
import type { Prettify } from '@/utils/type';

type ExpandType = Prettify<{
  memodel: IMEModel;
  config: {
    synapses: Array<TSingleNeuronSynaptomeConfiguration>;
  } | null;
}>;

export async function loadExpandedSingleNeuronSynaptome({
  id,
  virtualLabId,
  projectId,
}: WorkspaceContext & {
  id: string;
}) {
  const { data: source, error } = await tryCatch(
    getSingleNeuronSynaptome({ id, context: { virtualLabId, projectId } })
  );

  if (error) {
    throw new Error('Failed to load single neuron synaptome entity details');
  }

  let data = {} as ExpandType | null;
  let error1 = null;
  if (singleNeuronSynaptomeEntity.api.expand) {
    ({ data, error: error1 } = await tryCatch(
      applyEntityExpansions<ISingleNeuronSynaptome, ExpandType>(
        singleNeuronSynaptomeEntity,
        source,
        {
          virtualLabId,
          projectId,
        }
      )
    ));
  }

  if (error1 || isNil(data)) {
    throw new Error('Failed to load single neuron synaptome relative data');
  }
  return {
    source,
    ...data,
  };
}

export default async function Configuration({
  entity,
  extendedType,
  ctx,
}: {
  entity: EntityTypeValue;
  extendedType: EntityCoreExtendedType;
  ctx: WorkspaceContext;
}) {
  const entityType = getEntityByExtendedType({ type: extendedType });
  if (!entityType) notFound();

  if (extendedType === 'emodel') {
    let morphology: ICellMorphologyExpanded | ICellMorphology;

    try {
      morphology = await getCellMorphology({
        id: (entity as IEModel).exemplar_morphology.id,
        expand: 'measurement_annotation',
        context: ctx,
      });
    } catch {
      notFound();
    }

    return (
      <EModelConfig payload={{ source: entity as IEModel, exemplar_morphology: morphology }} />
    );
  }

  if (extendedType === 'memodel') {
    return <MEModelConfig model={entity as IMEModel} />;
  }

  if (extendedType === 'single_neuron_synaptome') {
    let data: AwaitedType<ReturnType<typeof loadExpandedSingleNeuronSynaptome>>;
    try {
      data = await loadExpandedSingleNeuronSynaptome({
        virtualLabId: ctx.virtualLabId,
        projectId: ctx.projectId,
        id: entity.id,
      });
    } catch {
      notFound();
    }

    return (
      <div className="flex w-full flex-col gap-4">
        <SynaptomeConfig
          memodel={data.memodel}
          virtualLabId={ctx.virtualLabId}
          projectId={ctx.projectId}
        />

        <div className="mt-10">
          <SynapseGroupList config={data.config} />
        </div>
      </div>
    );
  }

  if (extendedType === 'single_neuron_simulation') {
    let config: AwaitedType<ReturnType<typeof singleNeuronSimulationApiQueryExpand.config>>;
    try {
      config = await singleNeuronSimulationApiQueryExpand.config(
        entity as ISingleNeuronSimulation,
        ctx
      );
    } catch {
      notFound();
    }

    return (
      <SimulationConfigurationTab
        type="single-neuron-simulation"
        simulation={config as SimulationPayload}
      />
    );
  }

  if (extendedType === 'single_neuron_synaptome_simulation') {
    let config: AwaitedType<
      ReturnType<typeof singleNeuronSynaptomeSimulationApiQueryExpand.config>
    >;
    try {
      config = await singleNeuronSynaptomeSimulationApiQueryExpand.config(
        entity as ISingleNeuronSynaptomeSimulation,
        ctx
      );
    } catch {
      notFound();
    }

    return (
      <SimulationConfigurationTab
        type="synaptome-simulation"
        simulation={config as SimulationPayload}
      />
    );
  }

  notFound();
}
