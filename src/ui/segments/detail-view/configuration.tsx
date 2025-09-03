import { JSX } from 'react';
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
  IReconstructionMorphology,
  IReconstructionMorphologyExpanded,
  ISingleNeuronSimulation,
  ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types';
import { getReconstructionMorphology } from '@/api/entitycore/queries';
import MEModelConfig from '@/features/entities/me-model/detail-view/configuration';
import SynaptomeConfig from '@/features/entities/single-neuron-synaptome/detail-view/configuration';
import SynapseGroupList from '@/features/entities/single-neuron-synaptome/detail-view/elements/list-synapses-configuration';
import { loadExpandedSingleNeuronSynaptome } from '@/page-wrappers/explore/single-neuron-synaptome';
import {
  singleNeuronSimulationApiQueryExpand,
  singleNeuronSynaptomeSimulationApiQueryExpand,
} from '@/entity-configuration/domain/simulation';
import SimulationConfigurationTab from '@/components/simulate/SimulationDetails/configuration-tab';
import { SimulationPayload } from '@/types/simulation/single-neuron';

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

  let content: JSX.Element | undefined;

  if (extendedType === 'emodel') {
    let morphology: IReconstructionMorphologyExpanded | IReconstructionMorphology;

    try {
      morphology = await getReconstructionMorphology({
        id: (entity as IEModel).exemplar_morphology.id,
        expand: 'measurement_annotation',
        context: ctx,
      });
    } catch {
      notFound();
    }

    content = (
      <EModelConfig
        params={{ id: entity.id, virtualLabId: ctx.virtualLabId, projectId: ctx.projectId }}
        payload={{ source: entity as IEModel, exemplar_morphology: morphology }}
      />
    );
  }

  if (extendedType === 'memodel') {
    content = <MEModelConfig model={entity as IMEModel} />;
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

    content = (
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

    content = (
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

    content = (
      <SimulationConfigurationTab
        type="single-neuron-simulation"
        simulation={config as SimulationPayload}
      />
    );
  }

  if (!content) notFound();

  return (
    <>
      <div className="mb-5">
        <div className="text-neutral-4 uppercase">Name</div>
        <div className="text-primary-8 text-2xl font-bold">{entity.name}</div>
      </div>
      {content}
    </>
  );
}
