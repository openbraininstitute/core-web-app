import { EntityCoreDataType } from '@/api/entitycore/types/shared/global';

export const AssetTypeToEndpoint: Partial<Record<EntityCoreDataType, string>> = {
  'reconstruction-morphology': 'morphology-image',
  // [DataType.ExperimentalElectroPhysiology]: 'trace-image',
  // [DataType.SingleNeuronSimulation]: 'simulation-plot',
  // [DataType.SingleNeuronSynaptomeSimulation]: 'simulation-plot',
};
