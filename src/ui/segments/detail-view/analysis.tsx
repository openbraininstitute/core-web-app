import { notFound } from 'next/navigation';
import {
  circuitTypes,
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

import Overview from '@/features/entities/circuit/elements/tabs-content/overview';
import Analysis from '@/features/model-analysis/explorer/container';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';

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

  if (circuitTypes.includes(extendedType)) {
    return <Overview circuit={entity as ICircuit} />;
  }

  return <Analysis />;
}
