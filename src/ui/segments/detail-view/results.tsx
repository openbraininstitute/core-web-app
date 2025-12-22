import { notFound } from 'next/navigation';
import {
  EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';

import { EntityTypeValue } from '@/entity-configuration/domain';
import { WorkspaceContext, AwaitedType } from '@/types/common';
import { ISingleNeuronSimulation, ISingleNeuronSynaptomeSimulation } from '@/api/entitycore/types';
import {
  singleNeuronSimulationApiQueryExpand,
  singleNeuronSynaptomeSimulationApiQueryExpand,
} from '@/entity-configuration/domain/simulation';
import SimulationResults from '@/components/simulate/SimulationDetails/recording-tab';

export default async function Results({
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

  if (extendedType === 'single_neuron_simulation') {
    let config: AwaitedType<ReturnType<typeof singleNeuronSimulationApiQueryExpand.config>>;
    try {
      config = await singleNeuronSimulationApiQueryExpand.config(
        entity as ISingleNeuronSimulation,
        ctx
      );

      if (!config) notFound();
    } catch {
      notFound();
    }

    return <SimulationResults recordings={config.simulation} />;
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

      if (!config) notFound();
    } catch {
      notFound();
    }
    return <SimulationResults recordings={config.simulation} />;
  }

  notFound();
}
