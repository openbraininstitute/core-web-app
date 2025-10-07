import { notFound } from 'next/navigation';
import {
  EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';

import EModelConfig from '@/components/build-section/cell-model-assignment/e-model/EModelView';
import { EntityTypeValue } from '@/entity-configuration/domain';
import { WorkspaceContext, AwaitedType } from '@/types/common';
import {
  IEModel,
  IMEModel,
  ICellMorphology,
  ICellMorphologyExpanded,
  ISingleNeuronSimulation,
  ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types';
import { getCellMorphology } from '@/api/entitycore/queries';
import MEModelConfig from '@/features/entities/me-model/detail-view/configuration';
import SynaptomeConfig from '@/features/entities/single-neuron-synaptome/detail-view/configuration';
import SynapseGroupList from '@/features/entities/single-neuron-synaptome/detail-view/elements/list-synapses-configuration';
import { loadExpandedSingleNeuronSynaptome } from '@/page-wrappers/explore/single-neuron-synaptome';
import {
  singleNeuronSimulationApiQueryExpand,
  singleNeuronSynaptomeSimulationApiQueryExpand,
} from '@/entity-configuration/domain/simulation';
import SimulationConfigurationTab from '@/components/simulate/SimulationDetails/configuration-tab';
import { SimulationPayload } from '@/types/small-scale-simulator/single-neuron';

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
      <EModelConfig
        params={{ id: entity.id, virtualLabId: ctx.virtualLabId, projectId: ctx.projectId }}
        payload={{ source: entity as IEModel, exemplar_morphology: morphology }}
      />
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
